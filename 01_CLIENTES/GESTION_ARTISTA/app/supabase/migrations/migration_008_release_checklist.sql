-- Migration 008: Create release_checklist_items table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS release_checklist_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_event_id   UUID,  -- optional link to calendar_events (no FK to avoid dependency issues)
  task                TEXT NOT NULL,
  is_done             BOOLEAN NOT NULL DEFAULT FALSE,
  due_date            DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS release_checklist_items_updated_at ON release_checklist_items;
CREATE TRIGGER release_checklist_items_updated_at
  BEFORE UPDATE ON release_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE release_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklist items"
  ON release_checklist_items FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own checklist items"
  ON release_checklist_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own checklist items"
  ON release_checklist_items FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own checklist items"
  ON release_checklist_items FOR DELETE
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS checklist_event_idx ON release_checklist_items (calendar_event_id);
