"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Song } from "@/types/database";
import { SongSchema, type SongFormData } from "@/lib/schemas";
export type { SongFormData } from "@/lib/schemas";

export type SongsResult =
  | { data: Song[]; error: null }
  | { data: null; error: string };

export type SongResult =
  | { data: Song; error: null }
  | { data: null; error: string };

export type MutationResult =
  | { data: Song; error: null }
  | { data: null; error: string };

export async function getSongsByYear(year?: number): Promise<SongsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("songs")
    .select("*")
    .eq("is_deleted", false)
    .order("title", { ascending: true });

  if (year !== undefined) query = query.eq("year", year);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data: data as Song[], error: null };
}

export async function searchSongs(query: string): Promise<SongsResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("is_deleted", false)
    .or(
      `title.ilike.%${query}%,artist_name.ilike.%${query}%,genre.ilike.%${query}%`
    )
    .order("year", { ascending: false })
    .order("title", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as Song[], error: null };
}

export async function getAvailableYears(): Promise<{
  data: number[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .select("year")
    .eq("is_deleted", false)
    .order("year", { ascending: false });

  if (error) return { data: null, error: error.message };

  const years = Array.from(new Set((data ?? []).map((r) => r.year as number)));
  return { data: years, error: null };
}

export async function createSong(
  formData: SongFormData
): Promise<MutationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = SongSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("songs")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Song, error: null };
}

export async function updateSong(
  id: string,
  formData: Partial<SongFormData>
): Promise<MutationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("songs")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Song, error: null };
}

export async function updateSongLyrics(
  id: string,
  lyrics: string | null
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("songs")
    .update({ lyrics, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateSongVisibility(
  id: string,
  is_public: boolean
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("songs")
    .update({ is_public, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getSongById(id: string): Promise<SongResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Song, error: null };
}

export async function deleteSong(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("songs")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
