"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Profile } from "@/types/database";

export const ProfileSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  avatar_url: z.string().url("URL inválida").nullable().optional(),
  artist_slug: z.string()
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9-]*$/, "Solo letras minúsculas, números y guiones")
    .nullable()
    .optional(),
  bio: z.string().max(300, "Máximo 300 caracteres").nullable().optional(),
  studio_name: z.string().max(60, "Máximo 60 caracteres").nullable().optional(),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

export async function getProfile(): Promise<{
  data: Profile | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_deleted", false)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Profile, error: null };
}

export async function updateProfile(
  formData: ProfileFormData
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    // Use cookie-based client only to authenticate the user
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return { data: null, error: "No autenticado" };
    const userId = authData.user.id;

    const parsed = ProfileSchema.safeParse(formData);
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0].message };
    }

    // Use admin client for the actual DB operation to avoid RLS or serialization issues
    const admin = createAdminSupabaseClient();

    const updatePayload: Record<string, unknown> = {
      full_name: parsed.data.full_name,
      updated_at: new Date().toISOString(),
      avatar_url: parsed.data.avatar_url !== undefined ? (parsed.data.avatar_url ?? null) : undefined,
      artist_slug: parsed.data.artist_slug !== undefined ? (parsed.data.artist_slug ?? null) : undefined,
      bio: parsed.data.bio !== undefined ? (parsed.data.bio ?? null) : undefined,
      studio_name: parsed.data.studio_name !== undefined ? (parsed.data.studio_name ?? null) : undefined,
    };
    // Remove undefined keys so Supabase ignores them
    Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k]);

    const { data, error } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id, email, full_name, avatar_url, role, artist_slug, bio, studio_name, preferences, created_at, updated_at, is_deleted")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Profile, error: null };
  } catch (err) {
    console.error("[updateProfile] unexpected error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error inesperado al guardar el perfil",
    };
  }
}

/**
 * Save user preferences to DB (merged with existing prefs).
 * Silently fails — preferences are not critical.
 */
export async function savePreferences(
  key: string,
  value: unknown
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use Supabase's jsonb_set equivalent via RPC or just do a read-merge-write
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const current = (profile?.preferences as Record<string, unknown>) ?? {};
    await supabase
      .from("profiles")
      .update({
        preferences: { ...current, [key]: value },
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  } catch {
    // Silent fail — preferences are non-critical
  }
}

export async function disconnectGoogle(): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
