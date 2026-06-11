-- ============================================================
-- Migration 019 — Song version type
-- ============================================================

ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_type TEXT DEFAULT NULL;

-- Allowed values: original, remix, radio_edit, acustico, extended, explicit, clean, instrumental
-- No hard constraint so new types can be added from the UI without a migration
