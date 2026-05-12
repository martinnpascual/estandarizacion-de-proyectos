"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ── Label helpers ─────────────────────────────────────────────────────────
const DRAFT_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  en_mezcla: "En mezcla",
  masterizada: "Masterizada",
  lista_para_publicar: "Lista para publicar",
};

const COLLAB_STATUS_LABELS: Record<string, string> = {
  propuesta_enviada: "Propuesta enviada",
  en_grabacion: "Grabación",
  recibido: "Recibido",
  mezclando: "Mezclando",
  listo: "Listo",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  en_produccion: "En producción",
  en_mezcla: "En mezcla",
  master: "Master",
  listo: "Listo",
  publicado: "Publicado",
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  album: "Álbum",
  ep: "EP",
  mixtape: "Mixtape",
  single: "Single",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  lanzamiento: "Lanzamiento",
  sesion_grabacion: "Sesión de grabación",
  evento_musical: "Evento musical",
  reunion: "Reunión",
  otro: "Otro",
};

function formatEventDate(isoDate: string): string {
  try {
    const d = new Date(isoDate.split("T")[0] + "T12:00:00");
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoDate;
  }
}

export interface SearchResult {
  id: string;
  type: "song" | "draft" | "collab" | "project" | "event";
  title: string;
  subtitle: string | null;
  href: string;
  /** Only populated for songs */
  bpm?: number | null;
  key_signature?: string | null;
  cover_art_url?: string | null;
}

export async function globalSearch(query: string): Promise<{
  data: SearchResult[];
  error: string | null;
}> {
  if (!query || query.trim().length < 2) {
    return { data: [], error: null };
  }

  const q = query.trim();
  const supabase = await createServerSupabaseClient();

  const [songsRes, draftsRes, collabsRes, projectsRes, eventsRes] =
    await Promise.all([
      supabase
        .from("songs")
        .select("id, title, artist_name, year, genre, bpm, key_signature, cover_art_url")
        .eq("is_deleted", false)
        .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%,genre.ilike.%${q}%`)
        .limit(5),

      supabase
        .from("drafts")
        .select("id, title, producer, status")
        .eq("is_deleted", false)
        .or(`title.ilike.%${q}%,producer.ilike.%${q}%`)
        .limit(5),

      supabase
        .from("collaborations")
        .select("id, song_title, artist_name, status")
        .eq("is_deleted", false)
        .or(`song_title.ilike.%${q}%,artist_name.ilike.%${q}%`)
        .limit(5),

      supabase
        .from("projects")
        .select("id, name, type, status")
        .eq("is_deleted", false)
        .ilike("name", `%${q}%`)
        .limit(5),

      supabase
        .from("calendar_events")
        .select("id, title, event_type, start_date")
        .eq("is_deleted", false)
        .ilike("title", `%${q}%`)
        .limit(5),
    ]);

  const results: SearchResult[] = [];

  for (const s of songsRes.data ?? []) {
    results.push({
      id: s.id,
      type: "song",
      title: s.title,
      subtitle: `${s.artist_name} · ${s.year}${s.genre ? ` · ${s.genre}` : ""}`,
      href: `/discografia?song=${s.id}`,
      bpm: s.bpm ?? null,
      key_signature: s.key_signature ?? null,
      cover_art_url: s.cover_art_url ?? null,
    });
  }

  for (const d of draftsRes.data ?? []) {
    const statusLabel = DRAFT_STATUS_LABELS[d.status] ?? d.status;
    const parts = [d.producer ? `Prod. ${d.producer}` : null, statusLabel].filter(Boolean);
    results.push({
      id: d.id,
      type: "draft",
      title: d.title,
      subtitle: parts.join(" · "),
      href: `/maquetas?draft=${d.id}`,
    });
  }

  for (const c of collabsRes.data ?? []) {
    const statusLabel = COLLAB_STATUS_LABELS[c.status] ?? c.status;
    results.push({
      id: c.id,
      type: "collab",
      title: c.song_title,
      subtitle: `ft. ${c.artist_name} · ${statusLabel}`,
      href: `/collabs?collab=${c.id}`,
    });
  }

  for (const p of projectsRes.data ?? []) {
    const typeLabel = PROJECT_TYPE_LABELS[p.type] ?? p.type;
    const statusLabel = PROJECT_STATUS_LABELS[p.status] ?? p.status;
    results.push({
      id: p.id,
      type: "project",
      title: p.name,
      subtitle: `${typeLabel} · ${statusLabel}`,
      href: `/proyectos?project=${p.id}`,
    });
  }

  for (const e of eventsRes.data ?? []) {
    const typeLabel = EVENT_TYPE_LABELS[e.event_type] ?? e.event_type;
    results.push({
      id: e.id,
      type: "event",
      title: e.title,
      subtitle: `${typeLabel} · ${formatEventDate(e.start_date)}`,
      href: `/calendario?event=${e.id}`,
    });
  }

  if (songsRes.error || draftsRes.error || collabsRes.error) {
    const err =
      songsRes.error?.message ??
      draftsRes.error?.message ??
      collabsRes.error?.message ??
      null;
    return { data: results, error: err };
  }

  return { data: results, error: null };
}
