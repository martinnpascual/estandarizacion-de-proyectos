"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { CalendarEvent, CalendarEventType } from "@/types/database";
import { CalendarEventSchema, type CalendarEventFormData } from "@/lib/schemas";
export type { CalendarEventFormData };

export async function getCalendarEvents(
  year: number,
  month: number
): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();

  // First and last day of the month (with buffer for calendar grid)
  const from = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const to = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_deleted", false)
    .gte("start_date", from)
    .lte("start_date", to)
    .order("start_date", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent[], error: null };
}

export async function getCalendarEventsForYear(
  year: number
): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const from = `${year}-01-01`;
  const to   = `${year}-12-31`;
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_deleted", false)
    .gte("start_date", from)
    .lte("start_date", to)
    .order("start_date", { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent[], error: null };
}

export async function getUpcomingEvents(limit = 5): Promise<{
  data: CalendarEvent[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_deleted", false)
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent[], error: null };
}

export async function createCalendarEvent(
  formData: CalendarEventFormData
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = CalendarEventSchema.safeParse(formData);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent, error: null };
}

export async function updateCalendarEvent(
  id: string,
  formData: Partial<CalendarEventFormData>
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("calendar_events")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent, error: null };
}

export async function deleteCalendarEvent(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("calendar_events")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getCalendarEventById(
  id: string
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as CalendarEvent, error: null };
}

export async function getUpcomingReleases(limit = 5): Promise<{
  data: CalendarEvent[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("is_deleted", false)
    .eq("event_type", "lanzamiento")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CalendarEvent[], error: null };
}
