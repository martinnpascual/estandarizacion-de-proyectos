"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Comment } from "@/types/database";

export const CommentSchema = z.object({
  body: z.string().min(1, "El comentario no puede estar vacío"),
  timestamp_seconds: z.number().min(0),
  song_id: z.string().uuid().nullable().default(null),
  draft_id: z.string().uuid().nullable().default(null),
  parent_id: z.string().uuid().nullable().default(null),
});

export type CommentFormData = z.infer<typeof CommentSchema>;

export type CommentsResult =
  | { data: Comment[]; error: null }
  | { data: null; error: string };

export type CommentResult =
  | { data: Comment; error: null }
  | { data: null; error: string };

export async function getComments(params: {
  song_id?: string;
  draft_id?: string;
}): Promise<CommentsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("comments")
    .select("*, author:profiles(id, full_name, avatar_url, role)")
    .eq("is_deleted", false)
    .order("timestamp_seconds", { ascending: true });

  if (params.song_id) query = query.eq("song_id", params.song_id);
  if (params.draft_id) query = query.eq("draft_id", params.draft_id);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as Comment[], error: null };
}

export async function createComment(
  formData: CommentFormData
): Promise<CommentResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = CommentSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ ...parsed.data, created_by: user.id })
    .select("*, author:profiles(id, full_name, avatar_url, role)")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Comment, error: null };
}

export async function resolveComment(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("comments")
    .update({ is_resolved: true })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateComment(
  id: string,
  body: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "El comentario no puede estar vacío" };

  const { error } = await supabase
    .from("comments")
    .update({ body: trimmed })
    .eq("id", id)
    .eq("created_by", user.id); // only own comments

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteComment(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("comments")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
