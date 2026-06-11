-- ============================================================
-- Migration 018 — Song public share links
-- ============================================================

-- Add share_token column to songs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

-- Index for fast lookup by token
CREATE INDEX IF NOT EXISTS songs_share_token_idx ON songs (share_token) WHERE share_token IS NOT NULL;
