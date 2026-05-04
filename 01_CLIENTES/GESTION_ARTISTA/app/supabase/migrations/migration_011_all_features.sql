-- Migration 011: All features — expenses, setlists, industry contacts, royalty splits, release tasks
-- Run this against the existing Supabase PostgreSQL database.

-- 1. New columns on existing songs table
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS isrc TEXT,
  ADD COLUMN IF NOT EXISTS pro_registration TEXT,
  ADD COLUMN IF NOT EXISTS distribution_status JSONB DEFAULT '{}';

-- 2. New columns on existing projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS upc TEXT;

-- 3. Expenses table (artist business expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('studio','mixing','mastering','distribucion','artwork','marketing','equipamiento','viajes','legales','otro')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  period_month TEXT NOT NULL, -- YYYY-MM
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_owner" ON expenses USING (created_by = auth.uid());

-- 4. Setlists table
CREATE TABLE IF NOT EXISTS setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setlists_owner" ON setlists USING (created_by = auth.uid());

-- 5. Setlist songs (tracks in a setlist)
CREATE TABLE IF NOT EXISTS setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES drafts(id) ON DELETE SET NULL,
  track_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setlist_songs_owner" ON setlist_songs
  USING (setlist_id IN (SELECT id FROM setlists WHERE created_by = auth.uid()));

-- 6. Industry contacts (CRM)
CREATE TABLE IF NOT EXISTS industry_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('productor','ingeniero','manager','booking_agent','sello','periodista','playlist_curator','otro')),
  email TEXT,
  phone TEXT,
  instagram TEXT,
  notes TEXT,
  last_contact DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);
ALTER TABLE industry_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_owner" ON industry_contacts USING (created_by = auth.uid());

-- 7. Royalty splits (per song)
CREATE TABLE IF NOT EXISTS royalty_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('artista','productor','featuring','publisher','otro')),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE royalty_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "splits_owner" ON royalty_splits USING (created_by = auth.uid());

-- 8. Release checklist items (linked to projects)
CREATE TABLE IF NOT EXISTS release_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('arte','metadata','distribucion','promo','redes','legal','otro')),
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  assigned_to TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE release_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_owner" ON release_tasks USING (created_by = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_period ON expenses(period_month);
CREATE INDEX IF NOT EXISTS idx_setlists_created_by ON setlists(created_by);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON industry_contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_splits_song ON royalty_splits(song_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_project ON release_tasks(project_id);
