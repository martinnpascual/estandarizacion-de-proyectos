-- ============================================
-- MIGRATION 001 — Fixes de Auditoría
-- ============================================
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema.sql original

-- ===========================================
-- HIGH-04: Índices para consultas frecuentes
-- ===========================================

-- Songs
CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre) WHERE genre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_created_by ON songs(created_by);
CREATE INDEX IF NOT EXISTS idx_songs_is_deleted ON songs(is_deleted);

-- Drafts
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_producer ON drafts(producer) WHERE producer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drafts_created_by ON drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_drafts_is_deleted ON drafts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_drafts_collaboration_id ON drafts(collaboration_id) WHERE collaboration_id IS NOT NULL;

-- Collaborations
CREATE INDEX IF NOT EXISTS idx_collabs_status ON collaborations(status);
CREATE INDEX IF NOT EXISTS idx_collabs_artist_name ON collaborations(artist_name);
CREATE INDEX IF NOT EXISTS idx_collabs_created_by ON collaborations(created_by);
CREATE INDEX IF NOT EXISTS idx_collabs_is_deleted ON collaborations(is_deleted);

-- Comments (alta frecuencia de consulta)
CREATE INDEX IF NOT EXISTS idx_comments_song_id ON comments(song_id) WHERE song_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_draft_id ON comments(draft_id) WHERE draft_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Calendar Events
CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_created_by ON calendar_events(created_by);

-- Social Stats (series temporales)
CREATE INDEX IF NOT EXISTS idx_social_stats_link_id ON social_stats(social_link_id);
CREATE INDEX IF NOT EXISTS idx_social_stats_recorded_at ON social_stats(recorded_at);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Project Tracks
CREATE INDEX IF NOT EXISTS idx_project_tracks_project_id ON project_tracks(project_id);

-- Drive Files
CREATE INDEX IF NOT EXISTS idx_drive_files_drive_id ON drive_files(drive_file_id);

-- Team Invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- ===========================================
-- HIGH-05: NOT NULL en created_by
-- ===========================================
-- NOTA: Solo se puede aplicar si no hay registros con NULL.
-- Si ya hay datos, ejecutar primero:
-- UPDATE songs SET created_by = (SELECT id FROM profiles WHERE role = 'artista' LIMIT 1) WHERE created_by IS NULL;

ALTER TABLE songs ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE drafts ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE collaborations ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE comments ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE calendar_events ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE draft_versions ALTER COLUMN created_by SET NOT NULL;

-- ===========================================
-- MED-02: Fix RLS INSERT en profiles (demasiado permisivo)
-- ===========================================
DROP POLICY IF EXISTS "Service role puede insertar perfiles" ON profiles;
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===========================================
-- MED-03: Consolidar políticas UPDATE duplicadas en comments
-- ===========================================
DROP POLICY IF EXISTS "Autor puede editar sus comentarios" ON comments;
DROP POLICY IF EXISTS "Artista puede resolver comentarios" ON comments;
CREATE POLICY "Autor o artista pueden editar comentarios"
  ON comments FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );
