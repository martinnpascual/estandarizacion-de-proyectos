"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NotifType = "event" | "collab_deadline" | "draft_ready" | "overdue" | "project_deadline";
export type NotifUrgency = "overdue" | "urgent" | "soon" | "upcoming" | "ready";

export interface AppNotification {
  id: string;
  type: NotifType;
  urgency: NotifUrgency;
  title: string;
  body: string;
  date: string;   // ISO date for sorting
  href: string;
  daysAway?: number; // negative = overdue
}

export async function getNotifications(windowDays = 14): Promise<{
  data: AppNotification[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + windowDays);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  // Past 7 days for overdue check
  const past7 = new Date(today);
  past7.setDate(today.getDate() - 7);
  const past7Str = past7.toISOString().split("T")[0];

  const [eventsRes, collabsRes, draftsRes, overdueCollabsRes, projectsRes, overdueProjectsRes] = await Promise.all([
    // Upcoming events
    supabase
      .from("calendar_events")
      .select("id, title, event_type, start_date")
      .eq("is_deleted", false)
      .gte("start_date", todayStr)
      .lte("start_date", futureDateStr)
      .order("start_date", { ascending: true })
      .limit(15),

    // Collabs with upcoming deadline
    supabase
      .from("collaborations")
      .select("id, song_title, artist_name, deadline, status")
      .eq("is_deleted", false)
      .neq("status", "listo")
      .not("deadline", "is", null)
      .gte("deadline", todayStr)
      .lte("deadline", futureDateStr)
      .order("deadline", { ascending: true })
      .limit(10),

    // Drafts ready to publish
    supabase
      .from("drafts")
      .select("id, title, updated_at")
      .eq("is_deleted", false)
      .eq("status", "lista_para_publicar")
      .order("updated_at", { ascending: false })
      .limit(10),

    // Overdue collabs (deadline in last 7 days, not done)
    supabase
      .from("collaborations")
      .select("id, song_title, artist_name, deadline, status")
      .eq("is_deleted", false)
      .neq("status", "listo")
      .not("deadline", "is", null)
      .gte("deadline", past7Str)
      .lt("deadline", todayStr)
      .order("deadline", { ascending: false })
      .limit(5),

    // Projects with upcoming target_date
    supabase
      .from("projects")
      .select("id, name, type, status, target_date")
      .eq("is_deleted", false)
      .neq("status", "publicado")
      .not("target_date", "is", null)
      .gte("target_date", todayStr)
      .lte("target_date", futureDateStr)
      .order("target_date", { ascending: true })
      .limit(8),

    // Overdue projects (target_date in last 7 days, not publicado)
    supabase
      .from("projects")
      .select("id, name, type, status, target_date")
      .eq("is_deleted", false)
      .neq("status", "publicado")
      .not("target_date", "is", null)
      .gte("target_date", past7Str)
      .lt("target_date", todayStr)
      .order("target_date", { ascending: false })
      .limit(4),
  ]);

  const notifs: AppNotification[] = [];

  // ── Events ─────────────────────────────────────────────────────────────
  for (const ev of eventsRes.data ?? []) {
    const daysAway = Math.round(
      (new Date(ev.start_date).getTime() - today.getTime()) / 86_400_000
    );
    const when =
      daysAway === 0 ? "Hoy" :
      daysAway === 1 ? "Mañana" :
      `En ${daysAway} días`;

    notifs.push({
      id: `event_${ev.id}`,
      type: "event",
      urgency: daysAway <= 1 ? "urgent" : daysAway <= 3 ? "soon" : "upcoming",
      title: ev.title,
      body: `${when} · ${formatEventType(ev.event_type)}`,
      date: ev.start_date,
      href: `/calendario?event=${ev.id}`,
      daysAway,
    });
  }

  // ── Upcoming collab deadlines ────────────────────────────────────────
  for (const c of collabsRes.data ?? []) {
    const daysAway = Math.round(
      (new Date(c.deadline!).getTime() - today.getTime()) / 86_400_000
    );
    const when =
      daysAway === 0 ? "Vence hoy" :
      daysAway === 1 ? "Vence mañana" :
      `Vence en ${daysAway} días`;

    notifs.push({
      id: `collab_${c.id}`,
      type: "collab_deadline",
      urgency: daysAway <= 1 ? "urgent" : daysAway <= 3 ? "soon" : "upcoming",
      title: `${c.song_title} ft. ${c.artist_name}`,
      body: when,
      date: c.deadline!,
      href: `/collabs?collab=${c.id}`,
      daysAway,
    });
  }

  // ── Drafts ready ─────────────────────────────────────────────────────
  for (const d of draftsRes.data ?? []) {
    notifs.push({
      id: `draft_${d.id}`,
      type: "draft_ready",
      urgency: "ready",
      title: d.title,
      body: "Lista para publicar",
      date: d.updated_at,
      href: `/maquetas?draft=${d.id}`,
    });
  }

  // ── Overdue collabs ──────────────────────────────────────────────────
  for (const c of overdueCollabsRes.data ?? []) {
    const daysAway = Math.round(
      (new Date(c.deadline!).getTime() - today.getTime()) / 86_400_000
    ); // will be negative
    notifs.push({
      id: `overdue_collab_${c.id}`,
      type: "overdue",
      urgency: "overdue",
      title: `${c.song_title} ft. ${c.artist_name}`,
      body: `Deadline vencido hace ${Math.abs(daysAway)} día${Math.abs(daysAway) !== 1 ? "s" : ""}`,
      date: c.deadline!,
      href: `/collabs?collab=${c.id}`,
      daysAway,
    });
  }

  // ── Upcoming project target dates ───────────────────────────────────
  for (const p of projectsRes.data ?? []) {
    const daysAway = Math.round(
      (new Date(p.target_date!).getTime() - today.getTime()) / 86_400_000
    );
    const when =
      daysAway === 0 ? "Fecha objetivo hoy" :
      daysAway === 1 ? "Fecha objetivo mañana" :
      `Fecha objetivo en ${daysAway} días`;

    notifs.push({
      id: `project_${p.id}`,
      type: "project_deadline",
      urgency: daysAway <= 1 ? "urgent" : daysAway <= 3 ? "soon" : "upcoming",
      title: p.name,
      body: `${when} · ${p.type.toUpperCase()}`,
      date: p.target_date!,
      href: `/proyectos?project=${p.id}`,
      daysAway,
    });
  }

  // ── Overdue projects ─────────────────────────────────────────────────
  for (const p of overdueProjectsRes.data ?? []) {
    const daysAway = Math.round(
      (new Date(p.target_date!).getTime() - today.getTime()) / 86_400_000
    ); // negative
    notifs.push({
      id: `overdue_project_${p.id}`,
      type: "overdue",
      urgency: "overdue",
      title: p.name,
      body: `Fecha objetivo vencida hace ${Math.abs(daysAway)} día${Math.abs(daysAway) !== 1 ? "s" : ""} · ${p.type.toUpperCase()}`,
      date: p.target_date!,
      href: `/proyectos?project=${p.id}`,
      daysAway,
    });
  }

  // Sort: overdue first, then by date ascending
  notifs.sort((a, b) => {
    const urgencyOrder: Record<NotifUrgency, number> = {
      overdue: 0, urgent: 1, soon: 2, ready: 3, upcoming: 4,
    };
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (uDiff !== 0) return uDiff;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const firstError = eventsRes.error ?? collabsRes.error ?? draftsRes.error ?? projectsRes.error;
  return { data: notifs, error: firstError?.message ?? null };
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    lanzamiento: "Lanzamiento",
    sesion_grabacion: "Sesión",
    evento_musical: "Evento",
    reunion: "Reunión",
    otro: "Evento",
  };
  return map[type] ?? type;
}
