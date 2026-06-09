"use server";

import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import type { SocialLink, SocialStat, SocialPlatform } from "@/types/database";
import { SocialLinkSchema, SocialStatSchema, type SocialLinkFormData, type SocialStatFormData } from "@/lib/schemas";
export type { SocialLinkFormData, SocialStatFormData };

export type SocialLinksResult =
  | { data: SocialLink[]; error: null }
  | { data: null; error: string };

export type SocialLinkMutation =
  | { data: SocialLink; error: null }
  | { data: null; error: string };

export interface SocialLinkWithLatestStat extends SocialLink {
  latest_stat?: SocialStat | null;
  previous_stat?: SocialStat | null;
}

export async function getSocialLinks(): Promise<{
  data: SocialLinkWithLatestStat[] | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: links, error: linksError } = await supabase
    .from("social_links")
    .select("*")
    .eq("is_deleted", false)
    .order("platform", { ascending: true });

  if (linksError) return { data: null, error: linksError.message };
  if (!links || links.length === 0) return { data: [], error: null };

  // Para cada link, obtener los últimos 2 stats (para calcular tendencia)
  const withStats: SocialLinkWithLatestStat[] = await Promise.all(
    (links as SocialLink[]).map(async (link) => {
      const { data: stats } = await supabase
        .from("social_stats")
        .select("*")
        .eq("social_link_id", link.id)
        .order("recorded_at", { ascending: false })
        .limit(2);

      const [latest, previous] = stats ?? [];
      return {
        ...link,
        latest_stat: (latest as SocialStat | null) ?? null,
        previous_stat: (previous as SocialStat | null) ?? null,
      };
    })
  );

  return { data: withStats, error: null };
}

export async function upsertSocialLink(
  formData: SocialLinkFormData
): Promise<SocialLinkMutation> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = SocialLinkSchema.safeParse(formData);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from("social_links")
    .select("id")
    .eq("platform", parsed.data.platform)
    .eq("is_deleted", false)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("social_links")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("social_links")
      .insert(parsed.data)
      .select()
      .single();
  }

  if (result.error) return { data: null, error: result.error.message };
  return { data: result.data as SocialLink, error: null };
}

export async function deleteSocialLink(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("social_links")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getSocialStatHistory(
  socialLinkId: string,
  limit = 30
): Promise<{ data: SocialStat[] | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("social_stats")
    .select("*")
    .eq("social_link_id", socialLinkId)
    .order("recorded_at", { ascending: true })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: data as SocialStat[], error: null };
}

export async function addSocialStat(
  formData: SocialStatFormData
): Promise<{ data: SocialStat | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = SocialStatSchema.safeParse(formData);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("social_stats")
    .insert({ ...parsed.data, recorded_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as SocialStat, error: null };
}

// ── Auto-sync ─────────────────────────────────────────────────────────────────

export interface SyncSocialResult {
  synced: number;
  results: Array<{ platform: string; status: string; followers?: number | null; error?: string }>;
  error?: string;
}

/**
 * Manually trigger auto-sync for the current user's social links.
 * Fetches live data from YouTube & Spotify public APIs and saves a new stat row.
 */
export async function syncSocialStats(): Promise<SyncSocialResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { synced: 0, results: [], error: "No autenticado" };

  const { data: links, error: linksError } = await supabase
    .from("social_links")
    .select("id, platform, url")
    .eq("is_deleted", false);

  if (linksError || !links) {
    return { synced: 0, results: [], error: linksError?.message ?? "Error al cargar redes" };
  }

  const { fetchPlatformStats, supportsAutoSync } = await import("@/lib/social-sync");

  const results: Array<{ platform: string; status: string; followers?: number | null; error?: string }> = [];

  for (const link of links) {
    if (!supportsAutoSync(link.platform)) {
      results.push({ platform: link.platform, status: "skipped" });
      continue;
    }

    const stats = await fetchPlatformStats(link.platform, link.url);

    if (stats.error) {
      results.push({ platform: link.platform, status: "error", error: stats.error });
      continue;
    }

    if (stats.followers === null && stats.monthly_plays === null) {
      results.push({ platform: link.platform, status: "no_data" });
      continue;
    }

    const { error: insertError } = await supabase.from("social_stats").insert({
      social_link_id: link.id,
      followers: stats.followers,
      monthly_plays: stats.monthly_plays,
      recorded_at: new Date().toISOString(),
    });

    results.push({
      platform: link.platform,
      status: insertError ? "error" : "ok",
      followers: stats.followers,
      error: insertError?.message,
    });
  }

  const synced = results.filter((r) => r.status === "ok").length;
  return { synced, results };
}
