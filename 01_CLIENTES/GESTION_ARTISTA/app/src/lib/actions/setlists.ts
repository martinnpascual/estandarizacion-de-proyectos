"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Setlist, SetlistSong } from "@/types/database";
import { z } from "zod";

const SetlistSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  event_date: z.string().nullable().default(null),
  venue: z.string().nullable().default(null),
});
export type SetlistFormData = z.infer<typeof SetlistSchema>;

// ─── Result types ─────────────────────────────────────────────────────────────

type SetlistsResult =
  | { data: Setlist[]; error: null }
  | { data: null; error: string };

type SetlistMutation =
  | { data: Setlist; error: null }
  | { data: null; error: string };

export type SetlistSongWithDetails = SetlistSong & {
  song?: {
    id: string;
    title: string;
    bpm: number | null;
    key_signature: string | null;
    duration_seconds: number | null;
    cover_art_url: string | null;
  } | null;
  draft?: {
    id: string;
    title: string;
    bpm: number | null;
    key_signature: string | null;
    cover_art_url: string | null;
  } | null;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSetlists(): Promise<SetlistsResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("setlists")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as Setlist[], error: null };
}

export async function getSetlistSongs(setlistId: string): Promise<{
  data: SetlistSongWithDetails[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("setlist_songs")
    .select(
      `*,
      song:songs(id, title, bpm, key_signature, duration_seconds, cover_art_url),
      draft:drafts(id, title, bpm, key_signature, cover_art_url)`
    )
    .eq("setlist_id", setlistId)
    .order("track_order", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as SetlistSongWithDetails[], error: null };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createSetlist(
  formData: SetlistFormData
): Promise<SetlistMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = SetlistSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Setlist, error: null };
}

export async function updateSetlist(
  id: string,
  formData: Partial<SetlistFormData>
): Promise<SetlistMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("setlists")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Setlist, error: null };
}

export async function deleteSetlist(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("setlists")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Setlist song management ──────────────────────────────────────────────────

export async function addSongToSetlist(
  setlistId: string,
  songId: string,
  trackOrder: number
): Promise<{ data: SetlistSong | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("setlist_songs")
    .insert({
      setlist_id: setlistId,
      song_id: songId,
      track_order: trackOrder,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SetlistSong, error: null };
}

export async function removeSongFromSetlist(
  setlistSongId: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("setlist_songs")
    .delete()
    .eq("id", setlistSongId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function reorderSetlistSongs(
  setlistId: string,
  orderedIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("setlist_songs")
      .update({ track_order: index + 1 })
      .eq("id", id)
      .eq("setlist_id", setlistId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { error: firstError.error.message };
  return { error: null };
}
