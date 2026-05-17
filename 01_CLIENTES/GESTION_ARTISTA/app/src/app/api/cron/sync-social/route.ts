/**
 * GET /api/cron/sync-social
 *
 * Called automatically by Vercel Cron (daily at 09:00 UTC).
 * Can also be triggered manually via the Redes Sociales UI.
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 *
 * What it does:
 *  1. Fetches all active social_links from the DB (service role — bypasses RLS)
 *  2. For platforms that support it (YouTube, Spotify), calls their public APIs
 *  3. Inserts a new social_stats row with today's data
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { fetchPlatformStats, supportsAutoSync } from "@/lib/social-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET env variable not set" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch all active social links (service role bypasses RLS) ─────────────
  const supabase = createAdminSupabaseClient();

  const { data: links, error: linksError } = await supabase
    .from("social_links")
    .select("id, platform, url")
    .eq("is_deleted", false);

  if (linksError || !links) {
    return NextResponse.json(
      { error: linksError?.message ?? "Error fetching social links" },
      { status: 500 }
    );
  }

  // ── Sync each platform ────────────────────────────────────────────────────
  type SyncEntry = { id: string; platform: string; status: string; error?: string };
  const results: SyncEntry[] = [];

  for (const link of links) {
    if (!supportsAutoSync(link.platform)) {
      results.push({ id: link.id, platform: link.platform, status: "skipped" });
      continue;
    }

    const stats = await fetchPlatformStats(link.platform, link.url);

    if (stats.error) {
      console.error(`[sync-social] ${link.platform} (${link.id}): ${stats.error}`);
      results.push({ id: link.id, platform: link.platform, status: "error", error: stats.error });
      continue;
    }

    if (stats.followers === null && stats.monthly_plays === null) {
      results.push({ id: link.id, platform: link.platform, status: "no_data" });
      continue;
    }

    const { error: insertError } = await supabase.from("social_stats").insert({
      social_link_id: link.id,
      followers: stats.followers,
      monthly_plays: stats.monthly_plays,
      recorded_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error(`[sync-social] insert error for ${link.id}: ${insertError.message}`);
      results.push({ id: link.id, platform: link.platform, status: "insert_error", error: insertError.message });
    } else {
      results.push({ id: link.id, platform: link.platform, status: "ok" });
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error" || r.status === "insert_error").length;

  console.log(`[sync-social] Done. Synced: ${synced}, Errors: ${errors}, Total: ${links.length}`);

  return NextResponse.json({
    synced,
    errors,
    total: links.length,
    results,
    ts: new Date().toISOString(),
  });
}
