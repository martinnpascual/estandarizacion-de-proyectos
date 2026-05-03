-- Migration 005: Add lyrics column to songs table
-- Run this in your Supabase SQL Editor

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS lyrics TEXT DEFAULT NULL;

-- Optional: Add a GIN index for full-text search on lyrics
-- CREATE INDEX IF NOT EXISTS songs_lyrics_fts_idx ON songs USING GIN (to_tsvector('spanish', COALESCE(lyrics, '')));

COMMENT ON COLUMN songs.lyrics IS 'Letra completa de la canción';
