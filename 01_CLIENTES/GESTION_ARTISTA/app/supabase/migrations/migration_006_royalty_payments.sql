-- Migration 006: Create royalty_payments table
-- Run this in your Supabase SQL Editor

CREATE TYPE IF NOT EXISTS royalty_source AS ENUM (
  'spotify',
  'youtube',
  'apple_music',
  'tidal',
  'amazon_music',
  'soundcloud',
  'directo',
  'sync',
  'otro'
);

CREATE TABLE IF NOT EXISTS royalty_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        royalty_source NOT NULL,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  period_month  CHAR(7) NOT NULL,  -- 'YYYY-MM'
  song_id       UUID REFERENCES songs(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS royalty_payments_updated_at ON royalty_payments;
CREATE TRIGGER royalty_payments_updated_at
  BEFORE UPDATE ON royalty_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE royalty_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own royalty payments"
  ON royalty_payments FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own royalty payments"
  ON royalty_payments FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own royalty payments"
  ON royalty_payments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own royalty payments"
  ON royalty_payments FOR DELETE
  USING (auth.uid() = created_by);

-- Index for fast queries by period and user
CREATE INDEX IF NOT EXISTS royalty_payments_period_idx ON royalty_payments (created_by, period_month);
CREATE INDEX IF NOT EXISTS royalty_payments_source_idx ON royalty_payments (created_by, source);
