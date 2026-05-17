"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Project, ProjectType, ProjectStatus, ProjectTrack } from "@/types/database";
import { ProjectSchema, type ProjectFormData } from "@/lib/schemas";
export type { ProjectFormData };

type ProjectsResult =
  | { data: Project[]; error: null }
  | { data: null; error: string };

type ProjectMutation =
  | { data: Project; error: null }
  | { data: null; error: string };

export interface ProjectWithTracks extends Project {
  tracks: ProjectTrack[];
}

export async function getProjects(
  typeFilter?: ProjectType
): Promise<ProjectsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("projects")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (typeFilter) query = query.eq("type", typeFilter);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as Project[], error: null };
}

export type TrackSongMeta = {
  title: string;
  artist_name: string;
  drive_file_id: string | null;
  drive_file_url: string | null;
  cover_art_url: string | null;
  duration_seconds: number | null;
};

export type TrackDraftMeta = {
  title: string;
  drive_file_id: string | null;
  drive_file_url: string | null;
};

export type TrackWithAudio = ProjectTrack & {
  song?: TrackSongMeta | null;
  draft?: TrackDraftMeta | null;
};

export async function getProjectTracks(projectId: string): Promise<{
  data: TrackWithAudio[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("project_tracks")
    .select(
      "*, song:songs(title, artist_name, drive_file_id, drive_file_url, cover_art_url, duration_seconds), draft:drafts(title, drive_file_id, drive_file_url)"
    )
    .eq("project_id", projectId)
    .order("track_order", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data as TrackWithAudio[], error: null };
}

export async function createProject(
  formData: ProjectFormData
): Promise<ProjectMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = ProjectSchema.safeParse(formData);
  if (!parsed.success)
    return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Project, error: null };
}

export async function updateProject(
  id: string,
  formData: Partial<ProjectFormData>
): Promise<ProjectMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("projects")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Project, error: null };
}

export async function deleteProject(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("projects")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function addTrackToProject(params: {
  project_id: string;
  song_id?: string;
  draft_id?: string;
  track_order: number;
}): Promise<{ data: ProjectTrack | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("project_tracks")
    .insert(params)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ProjectTrack, error: null };
}

export async function removeTrackFromProject(
  trackId: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("project_tracks")
    .delete()
    .eq("id", trackId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function reorderProjectTracks(
  tracks: Array<{ id: string; track_order: number }>
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();

  const updates = tracks.map(({ id, track_order }) =>
    supabase
      .from("project_tracks")
      .update({ track_order })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { error: firstError.error.message };
  return { error: null };
}
