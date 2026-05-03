import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/types/database";

async function getAuthenticatedCalendar(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.google_access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: profile.google_access_token,
    refresh_token: profile.google_refresh_token,
    expiry_date: profile.google_token_expiry
      ? new Date(profile.google_token_expiry).getTime()
      : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await supabase
      .from("profiles")
      .update({
        google_access_token: tokens.access_token ?? profile.google_access_token,
        google_refresh_token: tokens.refresh_token ?? profile.google_refresh_token,
        google_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  });

  return { calendar: google.calendar({ version: "v3", auth: oauth2Client }), supabase };
}

// POST /api/calendar/sync — push local events to Google Calendar
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const result = await getAuthenticatedCalendar(user.id);
  if (!result) {
    return NextResponse.json({ error: "Google Calendar no conectado", needs_auth: true }, { status: 403 });
  }
  const { calendar } = result;

  // Get local events without a google_event_id (not yet synced)
  const { data: localEvents, error: dbError } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_deleted", false)
    .is("google_event_id", null);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const synced: string[] = [];
  const errors: string[] = [];

  for (const ev of (localEvents as CalendarEvent[])) {
    try {
      const gEvent = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: ev.title,
          description: ev.description ?? undefined,
          start: ev.all_day
            ? { date: ev.start_date.split("T")[0] }
            : { dateTime: ev.start_date },
          end: ev.all_day
            ? { date: (ev.end_date ?? ev.start_date).split("T")[0] }
            : { dateTime: ev.end_date ?? ev.start_date },
        },
      });

      await supabase
        .from("calendar_events")
        .update({ google_event_id: gEvent.data.id, updated_at: new Date().toISOString() })
        .eq("id", ev.id);

      synced.push(ev.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "error";
      errors.push(`${ev.title}: ${msg}`);
    }
  }

  return NextResponse.json({ synced: synced.length, errors });
}

// GET /api/calendar/sync — pull Google Calendar events into local DB
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const result = await getAuthenticatedCalendar(user.id);
  if (!result) {
    return NextResponse.json({ error: "Google Calendar no conectado", needs_auth: true }, { status: 403 });
  }
  const { calendar } = result;

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("from") ?? new Date().toISOString();
  const timeMax = searchParams.get("to") ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const imported: number[] = [];
    for (const gEv of response.data.items ?? []) {
      if (!gEv.id) continue;

      // Skip if already imported
      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id")
        .eq("google_event_id", gEv.id)
        .maybeSingle();

      if (existing) continue;

      const startDate = gEv.start?.dateTime ?? gEv.start?.date ?? "";
      const endDate = gEv.end?.dateTime ?? gEv.end?.date ?? null;
      const allDay = !gEv.start?.dateTime;

      await supabase.from("calendar_events").insert({
        title: gEv.summary ?? "Sin título",
        description: gEv.description ?? null,
        event_type: "otro",
        start_date: startDate,
        end_date: endDate,
        all_day: allDay,
        google_event_id: gEv.id,
        created_by: user.id,
      });

      imported.push(1);
    }

    return NextResponse.json({ imported: imported.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
