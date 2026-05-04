"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TrashItemType = "song" | "draft" | "collab" | "project" | "event";

export interface TrashItem {
  id: string;
  type: TrashItemType;
  title: string;
  subtitle: string;
  deleted_at: string;
}

const TABLE_MAP: Record<TrashItemType, { table: string; titleCol: string; subtitleCol?: string }> = {
  song:    { table: "songs",          titleCol: "title",      subtitleCol: "artist_name" },
  draft:   { table: "drafts",         titleCol: "title",      subtitleCol: "producer" },
  collab:  { table: "collaborations", titleCol: "song_title", subtitleCol: "artist_name" },
  project: { table: "projects",       titleCol: "title" },
  event:   { table: "calendar_events", titleCol: "title" },
};

export async function getTrashItems(): Promise<{ data: TrashItem[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const allItems: TrashItem[] = [];

  for (const [type, cfg] of Object.entries(TABLE_MAP) as [TrashItemType, typeof TABLE_MAP[TrashItemType]][]) {
    const cols = `id, ${cfg.titleCol}${cfg.subtitleCol ? `, ${cfg.subtitleCol}` : ""}, deleted_at`;
    const { data, error } = await supabase
      .from(cfg.table)
      .select(cols)
      .eq("is_deleted", true)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error || !data) continue;

    for (const row of data as unknown as Record<string, string>[]) {
      allItems.push({
        id: row.id,
        type,
        title: row[cfg.titleCol] ?? "(sin título)",
        subtitle: cfg.subtitleCol ? (row[cfg.subtitleCol] ?? "") : "",
        deleted_at: row.deleted_at,
      });
    }
  }

  allItems.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  return { data: allItems, error: null };
}

export async function restoreTrashItem(
  type: TrashItemType,
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const cfg = TABLE_MAP[type];

  const { error } = await supabase
    .from(cfg.table)
    .update({ is_deleted: false, deleted_at: null, deleted_by: null })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function permanentlyDeleteItem(
  type: TrashItemType,
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const cfg = TABLE_MAP[type];

  const { error } = await supabase.from(cfg.table).delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function emptyTrash(
  types?: TrashItemType[]
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const targetTypes = types ?? (Object.keys(TABLE_MAP) as TrashItemType[]);

  for (const type of targetTypes) {
    const cfg = TABLE_MAP[type];
    await supabase.from(cfg.table).delete().eq("is_deleted", true).not("deleted_at", "is", null);
  }

  return { error: null };
}
