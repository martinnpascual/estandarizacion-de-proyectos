/**
 * GET /api/cron/sync-goals
 *
 * Called automatically by Vercel Cron (daily at 10:00 UTC).
 * Can also be triggered manually via the Metas UI.
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 *
 * What it does:
 *  1. Fetches all goals where auto_update = true and platform_url IS NOT NULL
 *  2. For YouTube URLs: fetches view count (video) or subscriber count (channel)
 *  3. Updates goals.current_value with the fresh stat
 *
 * Supported URLs:
 *   - youtube.com/@Handle      → subscriber count
 *   - youtube.com/channel/UC…  → subscriber count
 *   - youtube.com/watch?v=…    → view count
 *   - youtu.be/…               → view count
 *   - youtube.com/shorts/…     → view count
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { fetchYouTubeGoalStat } from "@/lib/social-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncEntry = {
  id: string;
  title: string;
  platform: string;
  metric: string;
  old_value: number;
  new_value: number | null;
  status: "ok" | "error" | "no_change" | "skipped";
  error?: string;
};

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

  // ── Fetch goals eligible for auto-update ──────────────────────────────────
  const supabase = createAdminSupabaseClient();

  const { data: goals, error: fetchError } = await supabase
    .from("goals")
    .select("id, title, current_value, platform_url")
    .eq("auto_update", true)
    .not("platform_url", "is", null)
    .eq("is_completed", false);

  if (fetchError) {
    console.error("[sync-goals] fetch error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!goals || goals.length === 0) {
    return NextResponse.json({
      synced: 0,
      errors: 0,
      total: 0,
      results: [],
      message: "No goals with auto_update enabled",
      ts: new Date().toISOString(),
    });
  }

  const results: SyncEntry[] = [];

  for (const goal of goals) {
    const url: string = goal.platform_url as string;

    // Only YouTube is supported at this time
    const isYouTube =
      url.includes("youtube.com") || url.includes("youtu.be");

    if (!isYouTube) {
      results.push({
        id: goal.id,
        title: goal.title,
        platform: "unknown",
        metric: "-",
        old_value: goal.current_value,
        new_value: null,
        status: "skipped",
        error: "Only YouTube URLs are supported",
      });
      continue;
    }

    const stat = await fetchYouTubeGoalStat(url);

    if (stat.error || stat.value === null) {
      console.error(`[sync-goals] ${goal.id} (${goal.title}): ${stat.error}`);
      results.push({
        id: goal.id,
        title: goal.title,
        platform: "youtube",
        metric: stat.metric,
        old_value: goal.current_value,
        new_value: null,
        status: "error",
        error: stat.error,
      });
      continue;
    }

    if (stat.value === goal.current_value) {
      results.push({
        id: goal.id,
        title: goal.title,
        platform: "youtube",
        metric: stat.metric,
        old_value: goal.current_value,
        new_value: stat.value,
        status: "no_change",
      });
      continue;
    }

    const { error: updateError } = await supabase
      .from("goals")
      .update({ current_value: stat.value, updated_at: new Date().toISOString() })
      .eq("id", goal.id);

    if (updateError) {
      console.error(`[sync-goals] update error for ${goal.id}: ${updateError.message}`);
      results.push({
        id: goal.id,
        title: goal.title,
        platform: "youtube",
        metric: stat.metric,
        old_value: goal.current_value,
        new_value: stat.value,
        status: "error",
        error: updateError.message,
      });
    } else {
      console.log(
        `[sync-goals] updated "${goal.title}": ${goal.current_value} → ${stat.value} (${stat.metric})`
      );
      results.push({
        id: goal.id,
        title: goal.title,
        platform: "youtube",
        metric: stat.metric,
        old_value: goal.current_value,
        new_value: stat.value,
        status: "ok",
      });
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;
  const noChange = results.filter((r) => r.status === "no_change").length;

  console.log(
    `[sync-goals] Done. Updated: ${synced}, No change: ${noChange}, Errors: ${errors}, Total: ${goals.length}`
  );

  return NextResponse.json({
    synced,
    errors,
    no_change: noChange,
    total: goals.length,
    results,
    ts: new Date().toISOString(),
  });
}
