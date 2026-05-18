"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoalSchema } from "@/lib/schemas";
import type { GoalFormData } from "@/lib/schemas";
import type { Goal } from "@/types/database";
import { revalidatePath } from "next/cache";
import { fetchYouTubeGoalStat } from "@/lib/social-sync";

// ─── Get all goals ────────────────────────────────────────────────────────────
export async function getGoals(filters?: {
  category?: string;
  is_completed?: boolean;
}): Promise<{ data: Goal[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "No autenticado" };

  let query = supabase
    .from("goals")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.is_completed !== undefined) query = query.eq("is_completed", filters.is_completed);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Goal[], error: null };
}

// ─── Create goal ──────────────────────────────────────────────────────────────
export async function createGoal(
  formData: GoalFormData
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = GoalSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/metas");
  return { data: data as Goal, error: null };
}

// ─── Update goal ──────────────────────────────────────────────────────────────
export async function updateGoal(
  id: string,
  updates: Partial<GoalFormData & { is_completed: boolean; current_value: number }>
): Promise<{ data: Goal | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/metas");
  return { data: data as Goal, error: null };
}

// ─── Manual sync: fetch YouTube stat now and update current_value ─────────────
export async function syncGoalNow(
  id: string
): Promise<{ newValue: number | null; metric: string; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { newValue: null, metric: "", error: "No autenticado" };

  // Fetch the goal's platform_url
  const { data: goal, error: fetchErr } = await supabase
    .from("goals")
    .select("id, platform_url, current_value")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (fetchErr || !goal) return { newValue: null, metric: "", error: "Meta no encontrada" };
  if (!goal.platform_url) return { newValue: null, metric: "", error: "Esta meta no tiene URL configurada" };

  const url: string = goal.platform_url;
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  if (!isYouTube) return { newValue: null, metric: "", error: "Solo se soportan URLs de YouTube" };

  const stat = await fetchYouTubeGoalStat(url);
  if (stat.error || stat.value === null) {
    return { newValue: null, metric: stat.metric, error: stat.error ?? "No se pudo obtener el dato" };
  }

  // Update the goal
  const { error: updateErr } = await supabase
    .from("goals")
    .update({ current_value: stat.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id);

  if (updateErr) return { newValue: null, metric: stat.metric, error: updateErr.message };

  revalidatePath("/metas");
  return { newValue: stat.value, metric: stat.metric, error: null };
}

// ─── Delete goal ──────────────────────────────────────────────────────────────
export async function deleteGoal(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/metas");
  return { error: null };
}
