"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Song } from "@/types/database";

// ── Maquetas stats ──────────────────────────────────────────────────

export interface MaquetasStats {
  total: number;
  byStatus: { status: string; label: string; count: number; color: string }[];
  topProducers: { producer: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

const DRAFT_STATUS_META: Record<string, { label: string; color: string }> = {
  borrador:            { label: "Borrador",            color: "#71717a" },
  en_mezcla:          { label: "En mezcla",            color: "#60a5fa" },
  masterizada:        { label: "Masterizada",          color: "#c084fc" },
  lista_para_publicar:{ label: "Lista para publicar",  color: "#4ade80" },
};

export async function getMaquetasStats(): Promise<{
  data: MaquetasStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("id, status, producer, created_at")
    .eq("is_deleted", false);

  if (error) return { data: null, error: error.message };
  const drafts = data ?? [];

  // by status
  const statusMap: Record<string, number> = {};
  for (const d of drafts) {
    statusMap[d.status] = (statusMap[d.status] ?? 0) + 1;
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    label: DRAFT_STATUS_META[status]?.label ?? status,
    color: DRAFT_STATUS_META[status]?.color ?? "#71717a",
  })).sort((a, b) => {
    const order = ["borrador", "en_mezcla", "masterizada", "lista_para_publicar"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  // top producers
  const prodMap: Record<string, number> = {};
  for (const d of drafts) {
    if (d.producer?.trim()) {
      prodMap[d.producer.trim()] = (prodMap[d.producer.trim()] ?? 0) + 1;
    }
  }
  const topProducers = Object.entries(prodMap)
    .map(([producer, count]) => ({ producer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // by month (last 12 months)
  const monthMap: Record<string, number> = {};
  for (const d of drafts) {
    const m = d.created_at.slice(0, 7); // "YYYY-MM"
    monthMap[m] = (monthMap[m] ?? 0) + 1;
  }
  const byMonth = Object.entries(monthMap)
    .map(([month, count]) => ({
      month: new Date(month + "-15").toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return {
    data: { total: drafts.length, byStatus, topProducers, byMonth },
    error: null,
  };
}

// ── Collabs stats ───────────────────────────────────────────────────

export interface CollabsStats {
  total: number;
  completed: number;
  byStatus: { status: string; label: string; count: number; color: string }[];
  topArtists: { artist: string; count: number }[];
  byMonth: { month: string; count: number }[];
  withDeadline: number;
  overdueCount: number;
}

const COLLAB_STATUS_META: Record<string, { label: string; color: string }> = {
  propuesta_enviada: { label: "Propuesta enviada", color: "#facc15" },
  en_grabacion:     { label: "En grabación",       color: "#60a5fa" },
  recibido:         { label: "Recibido",            color: "#c084fc" },
  mezclando:        { label: "Mezclando",           color: "#fb923c" },
  listo:            { label: "Listo",               color: "#4ade80" },
};

export async function getCollabsStats(): Promise<{
  data: CollabsStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("collaborations")
    .select("id, status, artist_name, deadline, created_at")
    .eq("is_deleted", false);

  if (error) return { data: null, error: error.message };
  const collabs = data ?? [];

  const statusMap: Record<string, number> = {};
  for (const c of collabs) {
    statusMap[c.status] = (statusMap[c.status] ?? 0) + 1;
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
    label: COLLAB_STATUS_META[status]?.label ?? status,
    color: COLLAB_STATUS_META[status]?.color ?? "#71717a",
  })).sort((a, b) => {
    const order = ["propuesta_enviada", "en_grabacion", "recibido", "mezclando", "listo"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  const artistMap: Record<string, number> = {};
  for (const c of collabs) {
    if (c.artist_name?.trim()) {
      artistMap[c.artist_name.trim()] = (artistMap[c.artist_name.trim()] ?? 0) + 1;
    }
  }
  const topArtists = Object.entries(artistMap)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // collabs created per month (last 12 months)
  const monthMap: Record<string, number> = {};
  for (const c of collabs) {
    const m = c.created_at.slice(0, 7);
    monthMap[m] = (monthMap[m] ?? 0) + 1;
  }
  const byMonth = Object.entries(monthMap)
    .map(([month, count]) => ({
      month: new Date(month + "-15").toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  const now = new Date();
  const withDeadline = collabs.filter(c => !!c.deadline).length;
  const overdueCount = collabs.filter(c =>
    c.deadline && new Date(c.deadline) < now && c.status !== "listo"
  ).length;

  return {
    data: {
      total: collabs.length,
      completed: statusMap["listo"] ?? 0,
      byStatus,
      topArtists,
      byMonth,
      withDeadline,
      overdueCount,
    },
    error: null,
  };
}

// ── Projects stats ──────────────────────────────────────────────────

export interface ProjectsStats {
  total: number;
  byType: { type: string; label: string; count: number }[];
  byStatus: { status: string; label: string; count: number; color: string }[];
  upcoming: { id: string; name: string; status: string; statusLabel: string; statusColor: string; target_date: string; daysLeft: number }[];
  byMonth: { month: string; count: number }[];
  withTargetDate: number;
  overdue: number;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  album: "Álbum", ep: "EP", mixtape: "Mixtape", single: "Single",
};

const PROJECT_STATUS_META: Record<string, { label: string; color: string }> = {
  idea:          { label: "Idea",           color: "#71717a" },
  en_produccion: { label: "En producción",  color: "#60a5fa" },
  en_mezcla:     { label: "En mezcla",      color: "#c084fc" },
  master:        { label: "Master",         color: "#facc15" },
  listo:         { label: "Listo",          color: "#fb923c" },
  publicado:     { label: "Publicado",      color: "#4ade80" },
};

export async function getProjectsStats(): Promise<{
  data: ProjectsStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, type, status, target_date, created_at")
    .eq("is_deleted", false);

  if (error) return { data: null, error: error.message };
  const projects = data ?? [];

  const typeMap: Record<string, number> = {};
  const statusMap: Record<string, number> = {};

  for (const p of projects) {
    typeMap[p.type] = (typeMap[p.type] ?? 0) + 1;
    statusMap[p.status] = (statusMap[p.status] ?? 0) + 1;
  }

  const byType = Object.entries(typeMap).map(([type, count]) => ({
    type, count, label: PROJECT_TYPE_LABELS[type] ?? type,
  })).sort((a, b) => b.count - a.count);

  const byStatus = Object.entries(statusMap).map(([status, count]) => ({
    status, count,
    label: PROJECT_STATUS_META[status]?.label ?? status,
    color: PROJECT_STATUS_META[status]?.color ?? "#71717a",
  })).sort((a, b) => {
    const order = ["idea", "en_produccion", "en_mezcla", "master", "listo", "publicado"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const withTargetDate = projects.filter(p => !!p.target_date).length;

  const overdue = projects.filter(p =>
    p.target_date && new Date(p.target_date) < today && p.status !== "publicado"
  ).length;

  const upcoming = projects
    .filter(p => !!p.target_date)
    .map(p => {
      const td = new Date(p.target_date!);
      const daysLeft = Math.round((td.getTime() - today.getTime()) / 86_400_000);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        statusLabel: PROJECT_STATUS_META[p.status]?.label ?? p.status,
        statusColor: PROJECT_STATUS_META[p.status]?.color ?? "#71717a",
        target_date: p.target_date!,
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  // projects created per month (last 12 months)
  const monthMap: Record<string, number> = {};
  for (const p of projects) {
    if (p.created_at) {
      const m = p.created_at.slice(0, 7);
      monthMap[m] = (monthMap[m] ?? 0) + 1;
    }
  }
  const byMonth = Object.entries(monthMap)
    .map(([month, count]) => ({
      month: new Date(month + "-15").toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return { data: { total: projects.length, byType, byStatus, upcoming, byMonth, withTargetDate, overdue }, error: null };
}

// ── Goals / Metas stats ─────────────────────────────────────────────

export interface GoalsStats {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
  byCategory: { category: string; label: string; count: number; completed: number; color: string }[];
  nearDeadline: {
    id: string;
    title: string;
    category: string;
    categoryLabel: string;
    categoryColor: string;
    pct: number;
    target_date: string;
    daysLeft: number;
  }[];
}

const GOAL_CATEGORY_META: Record<string, { label: string; color: string }> = {
  streams:       { label: "Streams",       color: "#4ade80" },
  seguidores:    { label: "Seguidores",    color: "#60a5fa" },
  lanzamientos:  { label: "Lanzamientos",  color: "#c084fc" },
  ingresos:      { label: "Ingresos",      color: "#facc15" },
  colaboraciones:{ label: "Colaboraciones",color: "#fb923c" },
  otro:          { label: "Otro",          color: "#71717a" },
};

export async function getGoalsStats(): Promise<{
  data: GoalsStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("goals")
    .select("id, title, category, target_value, current_value, target_date, is_completed")
    .eq("is_deleted", false);

  if (error) return { data: null, error: error.message };
  const goals = data ?? [];

  const total     = goals.length;
  const completed = goals.filter(g => g.is_completed).length;
  const active    = total - completed;

  // Average progress across all active goals
  const progresses = goals
    .filter(g => !g.is_completed)
    .map(g => {
      const tv = g.target_value ?? 1;
      return Math.min(100, Math.round(((g.current_value ?? 0) / tv) * 100));
    });
  const avgProgress = progresses.length > 0
    ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)
    : 0;

  // By category
  const catMap: Record<string, { count: number; completed: number }> = {};
  for (const g of goals) {
    if (!catMap[g.category]) catMap[g.category] = { count: 0, completed: 0 };
    catMap[g.category].count++;
    if (g.is_completed) catMap[g.category].completed++;
  }
  const byCategory = Object.entries(catMap).map(([category, { count, completed }]) => ({
    category,
    label:     GOAL_CATEGORY_META[category]?.label ?? category,
    count,
    completed,
    color:     GOAL_CATEGORY_META[category]?.color ?? "#71717a",
  })).sort((a, b) => b.count - a.count);

  // Goals with deadline within next 30 days (not completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearDeadline = goals
    .filter(g => !g.is_completed && g.target_date)
    .map(g => {
      const td = new Date(g.target_date!);
      const daysLeft = Math.round((td.getTime() - today.getTime()) / 86_400_000);
      const tv = g.target_value ?? 1;
      const pct = Math.min(100, Math.round(((g.current_value ?? 0) / tv) * 100));
      return {
        id: g.id,
        title: g.title,
        category: g.category,
        categoryLabel: GOAL_CATEGORY_META[g.category]?.label ?? g.category,
        categoryColor: GOAL_CATEGORY_META[g.category]?.color ?? "#71717a",
        pct,
        target_date: g.target_date!,
        daysLeft,
      };
    })
    .filter(g => g.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  return {
    data: { total, active, completed, avgProgress, byCategory, nearDeadline },
    error: null,
  };
}

// ── Combined stats (used in estadísticas page) ───────────────────────

export type AllStats = {
  discografia: Awaited<ReturnType<typeof getDiscografiaStats>>["data"];
  maquetas: MaquetasStats | null;
  collabs: CollabsStats | null;
  projects: ProjectsStats | null;
  goals: GoalsStats | null;
};

export async function getAllStats(): Promise<{
  data: AllStats;
  error: string | null;
}> {
  const [discoRes, maquetasRes, collabsRes, projectsRes, goalsRes] = await Promise.all([
    getDiscografiaStats(),
    getMaquetasStats(),
    getCollabsStats(),
    getProjectsStats(),
    getGoalsStats(),
  ]);
  return {
    data: {
      discografia: discoRes.data,
      maquetas: maquetasRes.data,
      collabs: collabsRes.data,
      projects: projectsRes.data,
      goals: goalsRes.data,
    },
    error: discoRes.error ?? maquetasRes.error ?? collabsRes.error ?? projectsRes.error ?? goalsRes.error,
  };
}


export interface DiscografiaStats {
  totalSongs: number;
  totalDurationSeconds: number;
  totalGenres: number;
  platformCoverage: PlatformCoverage[];
  songsByYear: { year: number; count: number; avgDurationSeconds: number }[];
  songsByGenre: { genre: string; count: number }[];
  topTags: { tag: string; count: number }[];
  topFeaturing: { artist: string; count: number }[];
  recentSongs: Pick<Song, "id" | "title" | "artist_name" | "year" | "genre" | "cover_art_url" | "bpm" | "key_signature">[];
  bpmDistribution: { range: string; count: number }[];
  keyDistribution: { key: string; count: number }[];
  songsWithBpm: number;
  songsWithKey: number;
}

export interface PlatformCoverage {
  platform: string;
  count: number;
  total: number;
  pct: number;
}

export async function getDiscografiaStats(): Promise<{
  data: DiscografiaStats | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: songs, error } = await supabase
    .from("songs")
    .select(
      "id, title, artist_name, year, genre, duration_seconds, featuring, tags, spotify_url, youtube_url, apple_music_url, soundcloud_url, cover_art_url, bpm, key_signature"
    )
    .eq("is_deleted", false);

  if (error) return { data: null, error: error.message };
  if (!songs || songs.length === 0) {
    return {
      data: {
        totalSongs: 0,
        totalDurationSeconds: 0,
        totalGenres: 0,
        platformCoverage: [],
        songsByYear: [],
        songsByGenre: [],
        topTags: [],
        topFeaturing: [],
        recentSongs: [],
        bpmDistribution: [],
        keyDistribution: [],
        songsWithBpm: 0,
        songsWithKey: 0,
      },
      error: null,
    };
  }

  const total = songs.length;

  // Duration total
  const totalDurationSeconds = songs.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0
  );

  // Songs by year (with avg duration)
  const yearMap: Record<number, { count: number; totalDur: number }> = {};
  for (const s of songs) {
    const y = s.year;
    if (!yearMap[y]) yearMap[y] = { count: 0, totalDur: 0 };
    yearMap[y].count += 1;
    yearMap[y].totalDur += s.duration_seconds ?? 0;
  }
  const songsByYear = Object.entries(yearMap)
    .map(([y, { count, totalDur }]) => ({
      year: Number(y),
      count,
      avgDurationSeconds: count > 0 ? Math.round(totalDur / count) : 0,
    }))
    .sort((a, b) => a.year - b.year);

  // Songs by genre
  const genreMap: Record<string, number> = {};
  for (const s of songs) {
    const g = s.genre ?? "Sin género";
    genreMap[g] = (genreMap[g] ?? 0) + 1;
  }
  const songsByGenre = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const totalGenres = Object.keys(genreMap).filter(
    (g) => g !== "Sin género"
  ).length;

  // Platform coverage
  const platforms = [
    { platform: "Spotify", key: "spotify_url" },
    { platform: "YouTube", key: "youtube_url" },
    { platform: "Apple Music", key: "apple_music_url" },
    { platform: "SoundCloud", key: "soundcloud_url" },
  ] as const;

  const platformCoverage: PlatformCoverage[] = platforms.map(({ platform, key }) => {
    const count = songs.filter((s) => !!s[key]).length;
    return { platform, count, total, pct: Math.round((count / total) * 100) };
  });

  // Top tags
  const tagMap: Record<string, number> = {};
  for (const s of songs) {
    for (const tag of s.tags ?? []) {
      tagMap[tag] = (tagMap[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Top featuring artists
  const featMap: Record<string, number> = {};
  for (const s of songs) {
    for (const feat of s.featuring ?? []) {
      if (feat.trim()) {
        featMap[feat.trim()] = (featMap[feat.trim()] ?? 0) + 1;
      }
    }
  }
  const topFeaturing = Object.entries(featMap)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Recent songs (last 5)
  const recentSongs = [...songs]
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .map(({ id, title, artist_name, year, genre, cover_art_url, bpm, key_signature }) => ({
      id,
      title,
      artist_name,
      year,
      genre,
      cover_art_url: cover_art_url ?? null,
      bpm: bpm ?? null,
      key_signature: key_signature ?? null,
    }));

  // BPM distribution histogram
  const BPM_RANGES = [
    { label: "< 80",    min: 0,   max: 80       },
    { label: "80–100",  min: 80,  max: 100      },
    { label: "100–120", min: 100, max: 120      },
    { label: "120–140", min: 120, max: 140      },
    { label: "140–160", min: 140, max: 160      },
    { label: "160+",    min: 160, max: Infinity },
  ];
  const bpmBuckets: Record<string, number> = {};
  let songsWithBpm = 0;
  for (const s of songs) {
    if (s.bpm) {
      songsWithBpm++;
      for (const r of BPM_RANGES) {
        if (s.bpm >= r.min && s.bpm < r.max) {
          bpmBuckets[r.label] = (bpmBuckets[r.label] ?? 0) + 1;
          break;
        }
      }
    }
  }
  const bpmDistribution = BPM_RANGES
    .filter(r => (bpmBuckets[r.label] ?? 0) > 0)
    .map(r => ({ range: r.label, count: bpmBuckets[r.label] }));

  // Key signature distribution
  const keyMap: Record<string, number> = {};
  let songsWithKey = 0;
  for (const s of songs) {
    if (s.key_signature?.trim()) {
      songsWithKey++;
      const k = s.key_signature.trim();
      keyMap[k] = (keyMap[k] ?? 0) + 1;
    }
  }
  const keyDistribution = Object.entries(keyMap)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    data: {
      totalSongs: total,
      totalDurationSeconds,
      totalGenres,
      platformCoverage,
      songsByYear,
      songsByGenre,
      topTags,
      topFeaturing,
      recentSongs,
      bpmDistribution,
      keyDistribution,
      songsWithBpm,
      songsWithKey,
    },
    error: null,
  };
}
