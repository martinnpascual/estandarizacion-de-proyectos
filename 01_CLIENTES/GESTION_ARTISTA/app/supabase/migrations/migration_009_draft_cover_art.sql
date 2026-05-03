-- Migration 009: Add cover_art_url to drafts table
-- Run this in your Supabase SQL Editor

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS cover_art_url TEXT DEFAULT NULL;

COMMENT ON COLUMN drafts.cover_art_url IS 'URL de la imagen de portada de la maqueta (Google Drive o externa)';
