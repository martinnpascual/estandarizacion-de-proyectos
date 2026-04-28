"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Collaboration, CollabStatus } from "@/types/database";
import { CollabSchema, type CollabFormData } from "@/lib/schemas";
export type { CollabFormData };

type CollabsResult =
  | { data: Collaboration[]; error: null }
  | { data: null; error: string };

type CollabMutation =
  | { data: Collaboration; error: null }
  | { data: null; error: string };

export async function getCollabs(
  statusFilter?: CollabStatus
): Promise<CollabsResult> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("collaborations")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: data as Collaboration[], error: null };
}

export async function createCollab(
  formData: CollabFormData
): Promise<CollabMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = CollabSchema.safeParse(formData);
  if (!parsed.success)
    return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("collaborations")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Collaboration, error: null };
}

export async function updateCollab(
  id: string,
  formData: Partial<CollabFormData>
): Promise<CollabMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("collaborations")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Collaboration, error: null };
}

export async function deleteCollab(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("collaborations")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}
