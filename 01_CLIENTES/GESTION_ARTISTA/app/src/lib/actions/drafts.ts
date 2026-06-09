"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Draft, DraftStatus, DraftVersion, Song } from "@/types/database";
import { DraftSchema, type DraftFormData } from "@/lib/schemas";
export type { DraftFormData } from "@/lib/schemas";

export type DraftsResult =
  | { data: Draft[]; error: null }
  | { data: null; error: string };

export type DraftMutationResult =
  | { data: Draft; error: null }
  | { data: null; error: string };

export async function getDrafts(
  statusFilter?: DraftStatus
): Promise<DraftsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("drafts")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as Draft[], error: null };
}

export async function searchDrafts(query: string): Promise<DraftsResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("is_deleted", false)
    .or(`title.ilike.%${query}%,producer.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as Draft[], error: null };
}

export async function createDraft(
  formData: DraftFormData
): Promise<DraftMutationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = DraftSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("drafts")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Draft, error: null };
}

export async function updateDraft(
  id: string,
  formData: Partial<DraftFormData>
): Promise<DraftMutationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("drafts")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Draft, error: null };
}

export async function updateDraftStatus(
  id: string,
  status: DraftStatus
): Promise<DraftMutationResult> {
  return updateDraft(id, { status });
}

export async function deleteDraft(
  id: string
): Promise<{ error: string | null }> {
  // Verify authentication with user client
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Use admin client for soft-delete to bypass RLS SELECT policy on RETURNING
  // (PostgREST applies SELECT policy to RETURNING rows, which fails after is_deleted=true)
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("drafts")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Versiones de maqueta ──────────────────────────────────────────────

export type DraftVersionResult =
  | { data: DraftVersion; error: null }
  | { data: null; error: string };

export async function getDraftVersions(draftId: string): Promise<{
  data: DraftVersion[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("draft_versions")
    .select("*")
    .eq("draft_id", draftId)
    .is("deleted_at", null)
    .order("version_number", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as DraftVersion[], error: null };
}

export async function addDraftVersion(
  draftId: string,
  payload: {
    drive_file_id: string;
    drive_file_url?: string | null;
    notes?: string | null;
  }
): Promise<DraftVersionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  // Get next version number
  const { count } = await supabase
    .from("draft_versions")
    .select("id", { count: "exact", head: true })
    .eq("draft_id", draftId)
    .is("deleted_at", null);

  const version_number = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("draft_versions")
    .insert({
      draft_id: draftId,
      version_number,
      drive_file_id: payload.drive_file_id,
      drive_file_url: payload.drive_file_url ?? null,
      notes: payload.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as DraftVersion, error: null };
}

export async function updateDraftLyrics(
  id: string,
  lyrics: string | null
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("drafts")
    .update({ lyrics, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteDraftVersion(
  id: string
): Promise<{ error: string | null }> {
  // Verify authentication with user client
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Use admin client to avoid SELECT RLS conflict on soft-delete RETURNING
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("draft_versions")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Portada con IA ────────────────────────────────────────────────────

export async function getDraftsWithoutCovers(): Promise<{
  data: Array<{ id: string; title: string }> | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("id, title")
    .eq("is_deleted", false)
    .is("cover_art_url", null)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as Array<{ id: string; title: string }>, error: null };
}

export async function updateDraftCoverArt(
  id: string,
  coverArtUrl: string | null
): Promise<{ data: Draft | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("drafts")
    .update({ cover_art_url: coverArtUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Draft, error: null };
}

// ── Publicar maqueta ──────────────────────────────────────────────────

// Publica una maqueta moviéndola a la tabla songs
export async function publishDraft(
  draftId: string,
  songData: {
    title: string;
    artist_name: string;
    year: number;
    featuring: string[];
    genre: string | null;
    tags: string[];
    spotify_url?: string | null;
    youtube_url?: string | null;
    apple_music_url?: string | null;
    soundcloud_url?: string | null;
    drive_file_url?: string | null;
  }
): Promise<{ data: Song | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  // Obtener la maqueta
  const { data: draft, error: fetchError } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .eq("is_deleted", false)
    .single();

  if (fetchError || !draft)
    return { data: null, error: fetchError?.message ?? "Maqueta no encontrada" };

  // Crear la canción
  const { data: song, error: songError } = await supabase
    .from("songs")
    .insert({
      title: songData.title,
      artist_name: songData.artist_name,
      year: songData.year,
      featuring: songData.featuring,
      genre: songData.genre,
      tags: songData.tags,
      drive_file_id: draft.drive_file_id,
      drive_file_url: songData.drive_file_url ?? draft.drive_file_url,
      spotify_url: songData.spotify_url ?? null,
      youtube_url: songData.youtube_url ?? null,
      apple_music_url: songData.apple_music_url ?? null,
      soundcloud_url: songData.soundcloud_url ?? null,
      duration_seconds: null,
      cover_art_url: null,
      created_by: user.id,
    })
    .select()
    .single();

  if (songError) return { data: null, error: songError.message };

  // Soft-delete la maqueta (admin client bypasses SELECT RLS on RETURNING)
  const admin = createAdminSupabaseClient();
  await admin
    .from("drafts")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", draftId);

  return { data: song as Song, error: null };
}
