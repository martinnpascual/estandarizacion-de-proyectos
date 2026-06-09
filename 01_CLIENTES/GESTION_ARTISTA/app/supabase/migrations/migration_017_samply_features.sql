-- ============================================================
-- Migration 017 — Samply-inspired features
-- ============================================================

-- Feature 1: Comment emoji reactions
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍','🔥','✅','❤️','🎯')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, created_by, emoji)
);
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all reactions" ON comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON comment_reactions FOR ALL USING (auth.uid() = created_by);

-- Feature 2: Play events tracking
CREATE TABLE IF NOT EXISTS play_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
  song_id  UUID REFERENCES songs(id)  ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE play_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own play events" ON play_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can read own play events"   ON play_events FOR SELECT USING (auth.uid() = created_by);

-- Feature 3: Project custom color
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

-- Feature 4: Draft shareable link token
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

-- Feature 5: Draft auto-archive
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for fast cron lookup
CREATE INDEX IF NOT EXISTS drafts_archive_lookup
  ON drafts (is_archived, is_deleted, status, updated_at)
  WHERE is_archived = FALSE AND is_deleted = FALSE;
