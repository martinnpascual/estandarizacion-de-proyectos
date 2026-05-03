-- Migration 007: Create goals table
-- Run this in your Supabase SQL Editor

CREATE TYPE IF NOT EXISTS goal_category AS ENUM (
  'streams',
  'seguidores',
  'lanzamientos',
  'ingresos',
  'colaboraciones',
  'otro'
);

CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  category        goal_category NOT NULL DEFAULT 'otro',
  target_value    NUMERIC(14, 2) NOT NULL CHECK (target_value > 0),
  current_value   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  target_date     DATE,
  notes           TEXT,
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS goals_updated_at ON goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS goals_user_idx ON goals (created_by, is_completed);
CREATE INDEX IF NOT EXISTS goals_category_idx ON goals (created_by, category);
