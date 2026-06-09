/**
 * GET /api/cron/auto-archive-drafts
 * Vercel Cron — Mondays at 11:00 UTC
 *
 * Archives drafts that haven't been updated in 60+ days
 * and are not in 'lista_para_publicar' status.
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader  = req.headers.get("authorization");
  const cronSecret  = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const cutoff   = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const { data: candidates, error: fetchError } = await supabase
    .from("drafts")
    .select("id, title, updated_at, status")
    .eq("is_archived", false)
    .eq("is_deleted", false)
    .neq("status", "lista_para_publicar")
    .lt("updated_at", cutoff);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ archived: 0, total: 0, ts: new Date().toISOString() });
  }

  const ids = candidates.map((d) => d.id);
  const { error: updateError } = await supabase
    .from("drafts")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[auto-archive-drafts] Archived ${ids.length} drafts older than 60 days.`);

  return NextResponse.json({
    archived: ids.length,
    total:    candidates.length,
    titles:   candidates.map((d) => d.title),
    ts:       new Date().toISOString(),
  });
}
