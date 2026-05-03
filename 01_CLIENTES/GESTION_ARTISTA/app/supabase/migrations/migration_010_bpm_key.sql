-- Migration 010: Add BPM and key_signature fields to drafts and songs
-- These fields track musical properties useful for arrangement and cataloguing.

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS bpm INTEGER CHECK (bpm > 0 AND bpm <= 300),
  ADD COLUMN IF NOT EXISTS key_signature TEXT;

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS bpm INTEGER CHECK (bpm > 0 AND bpm <= 300),
  ADD COLUMN IF NOT EXISTS key_signature TEXT;
