"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetlistBeat {
  id: string;
  setlist_id: string;
  title: string;
  audio_url: string;
  file_path: string | null;
  duration_seconds: number | null;
  bpm: number | null;
  beat_order: number;
  created_at: string;
  created_by: string;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSetlistBeats(setlistId: string): Promise<{
  data: SetlistBeat[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("setlist_beats")
    .select("*")
    .eq("setlist_id", setlistId)
    .order("beat_order", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as SetlistBeat[], error: null };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function addSetlistBeat(
  setlistId: string,
  payload: {
    title: string;
    audio_url: string;
    file_path?: string | null;
    duration_seconds?: number | null;
    bpm?: number | null;
    beat_order: number;
  }
): Promise<{ data: SetlistBeat | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("setlist_beats")
    .insert({
      setlist_id: setlistId,
      title: payload.title.trim(),
      audio_url: payload.audio_url,
      file_path: payload.file_path ?? null,
      duration_seconds: payload.duration_seconds ?? null,
      bpm: payload.bpm ?? null,
      beat_order: payload.beat_order,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SetlistBeat, error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function removeSetlistBeat(
  beatId: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("setlist_beats")
    .delete()
    .eq("id", beatId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export async function reorderSetlistBeats(
  beatIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const updates = beatIds.map((id, index) =>
    supabase
      .from("setlist_beats")
      .update({ beat_order: index + 1 })
      .eq("id", id)
      .eq("created_by", user.id)
  );

  await Promise.all(updates);
  return { error: null };
}
