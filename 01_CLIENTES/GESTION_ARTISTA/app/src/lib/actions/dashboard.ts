"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Draft, Collaboration, Project } from "@/types/database";

export interface DashboardStats {
  totalSongs: number;
  activeDrafts: number;
  readyToPublish: number;
  pendingCollabs: number;
  eventsThisMonth: number;
  activeProjects: number;
  listoProjects: number;
  listoCollabs: number;
}

export async function getDashboardStats(): Promise<{
  data: DashboardStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [songsRes, draftsRes, readyRes, collabsRes, eventsRes, projectsRes, listoProjectsRes, listoCollabsRes] = await Promise.all([
    supabase.from("songs").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("drafts").select("id", { count: "exact", head: true }).eq("is_deleted", false).neq("status", "lista_para_publicar"),
    supabase.from("drafts").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "lista_para_publicar"),
    supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("is_deleted", false).neq("status", "listo"),
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("is_deleted", false).gte("start_date", monthStart).lte("start_date", monthEnd),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false).not("status", "in", '("idea","publicado")'),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "listo"),
    supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "listo"),
  ]);

  return {
    data: {
      totalSongs: songsRes.count ?? 0,
      activeDrafts: draftsRes.count ?? 0,
      readyToPublish: readyRes.count ?? 0,
      pendingCollabs: collabsRes.count ?? 0,
      eventsThisMonth: eventsRes.count ?? 0,
      activeProjects: projectsRes.count ?? 0,
      listoProjects: listoProjectsRes.count ?? 0,
      listoCollabs: listoCollabsRes.count ?? 0,
    },
    error: null,
  };
}

export async function getLatestDrafts(limit = 4): Promise<{
  data: Draft[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: data as Draft[], error: null };
}

export async function getActiveCollabs(limit = 4): Promise<{
  data: Collaboration[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select("*")
    .eq("is_deleted", false)
    .neq("status", "listo")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: data as Collaboration[], error: null };
}

// ── Activity feed ─────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: "song" | "draft" | "collab" | "project";
  action: "created" | "updated";
  title: string;
  subtitle: string;
  ts: string; // ISO timestamp
  href: string;
}

export async function getRecentActivity(limit = 12): Promise<{
  data: ActivityItem[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const [songsRes, draftsRes, collabsRes, projectsRes] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist_name, year, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("drafts")
      .select("id, title, status, producer, created_at, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("collaborations")
      .select("id, song_title, artist_name, status, created_at, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("projects")
      .select("id, name, type, status, created_at, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(4),
  ]);

  const STATUS_LABEL: Record<string, string> = {
    borrador: "Borrador",
    en_mezcla: "En mezcla",
    masterizada: "Masterizada",
    lista_para_publicar: "Lista para publicar",
    propuesta_enviada: "Propuesta enviada",
    en_grabacion: "En grabación",
    recibido: "Recibido",
    mezclando: "Mezclando",
    listo: "Listo",
  };

  const items: ActivityItem[] = [];

  for (const s of songsRes.data ?? []) {
    items.push({
      id: `song-${s.id}`,
      type: "song",
      action: "created",
      title: s.title,
      subtitle: `${s.artist_name} · ${s.year}`,
      ts: s.created_at,
      href: `/discografia?song=${s.id}`,
    });
  }

  for (const d of draftsRes.data ?? []) {
    const isNew = d.created_at === d.updated_at;
    items.push({
      id: `draft-${d.id}`,
      type: "draft",
      action: isNew ? "created" : "updated",
      title: d.title,
      subtitle: `${STATUS_LABEL[d.status] ?? d.status}${d.producer ? ` · ${d.producer}` : ""}`,
      ts: d.updated_at,
      href: `/maquetas?draft=${d.id}`,
    });
  }

  for (const c of collabsRes.data ?? []) {
    const isNew = c.created_at === c.updated_at;
    items.push({
      id: `collab-${c.id}`,
      type: "collab",
      action: isNew ? "created" : "updated",
      title: c.song_title,
      subtitle: `con ${c.artist_name} · ${STATUS_LABEL[c.status] ?? c.status}`,
      ts: c.updated_at,
      href: `/collabs?collab=${c.id}`,
    });
  }

  const PROJECT_STATUS_LABEL: Record<string, string> = {
    idea: "Idea", en_produccion: "En producción", en_mezcla: "En mezcla",
    master: "Master", listo: "Listo", publicado: "Publicado",
  };

  for (const p of projectsRes.data ?? []) {
    const isNew = p.created_at === p.updated_at;
    items.push({
      id: `project-${p.id}`,
      type: "project",
      action: isNew ? "created" : "updated",
      title: p.name,
      subtitle: `${p.type.toUpperCase()} · ${PROJECT_STATUS_LABEL[p.status] ?? p.status}`,
      ts: p.updated_at,
      href: `/proyectos?project=${p.id}`,
    });
  }

  items.sort((a, b) => b.ts.localeCompare(a.ts));

  return { data: items.slice(0, limit), error: null };
}

// ─────────────────────────────────────────────────────────────────────

export interface SongsByYear { year: number; count: number }
export interface SongsByGenre { genre: string; count: number }

export async function getSongsChartData(): Promise<{
  byYear: SongsByYear[];
  byGenre: SongsByGenre[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .select("year, genre")
    .eq("is_deleted", false);

  if (error) return { byYear: [], byGenre: [], error: error.message };

  // Aggregate by year
  const yearMap: Record<number, number> = {};
  const genreMap: Record<string, number> = {};

  for (const s of data ?? []) {
    yearMap[s.year] = (yearMap[s.year] ?? 0) + 1;
    const g = s.genre ?? "Sin género";
    genreMap[g] = (genreMap[g] ?? 0) + 1;
  }

  const byYear: SongsByYear[] = Object.entries(yearMap)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);

  const byGenre: SongsByGenre[] = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  return { byYear, byGenre, error: null };
}

export async function getActiveProjects(limit = 4): Promise<{
  data: Project[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("is_deleted", false)
    .not("status", "in", '("idea","publicado")')
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: error.message };
  return { data: data as Project[], error: null };
}
