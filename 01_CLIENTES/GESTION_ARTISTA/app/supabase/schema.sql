-- ============================================
-- GESTION ARTISTA — Esquema de Base de Datos
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Orden: Este archivo debe ejecutarse de arriba a abajo

-- ===========================================
-- 1. PROFILES (extiende auth.users)
-- ===========================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'productor' CHECK (role IN ('artista', 'productor', 'manager')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visibles para usuarios autenticados"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Usuarios pueden editar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role puede insertar perfiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ===========================================
-- 2. TEAM INVITATIONS
-- ===========================================
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'productor' CHECK (role IN ('productor', 'manager')),
  invited_by UUID REFERENCES auth.users(id),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artista puede gestionar invitaciones"
  ON team_invitations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

CREATE POLICY "Invitados pueden ver sus propias invitaciones"
  ON team_invitations FOR SELECT
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- ===========================================
-- 3. SONGS (Discografia publicada)
-- ===========================================
CREATE TABLE songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist_name TEXT DEFAULT 'BERTIAKA',
  featuring TEXT[] DEFAULT '{}',
  year INTEGER NOT NULL,
  genre TEXT,
  duration_seconds INTEGER,
  cover_art_url TEXT,
  drive_file_id TEXT,
  drive_file_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  apple_music_url TEXT,
  soundcloud_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canciones visibles para equipo"
  ON songs FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista y productor pueden crear canciones"
  ON songs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

CREATE POLICY "Artista puede editar canciones"
  ON songs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

CREATE POLICY "Artista puede eliminar canciones"
  ON songs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 4. COLLABORATIONS (Featuring)
-- ===========================================
CREATE TABLE collaborations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'propuesta_enviada'
    CHECK (status IN ('propuesta_enviada', 'en_grabacion', 'recibido', 'mezclando', 'listo')),
  deadline TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collabs visibles para equipo"
  ON collaborations FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista puede gestionar collabs"
  ON collaborations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 5. DRAFTS (Maquetas / WIP)
-- ===========================================
CREATE TABLE drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  producer TEXT,
  status TEXT NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador', 'en_mezcla', 'masterizada', 'lista_para_publicar')),
  drive_file_id TEXT,
  drive_file_url TEXT,
  notes TEXT,
  collaboration_id UUID REFERENCES collaborations(id),
  month_created TEXT DEFAULT to_char(now(), 'YYYY-MM'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maquetas visibles para equipo"
  ON drafts FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista y productor pueden crear maquetas"
  ON drafts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

CREATE POLICY "Artista puede editar maquetas"
  ON drafts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

CREATE POLICY "Artista puede eliminar maquetas"
  ON drafts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 6. DRAFT VERSIONS (Historial - v2)
-- ===========================================
CREATE TABLE draft_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  drive_file_id TEXT NOT NULL,
  drive_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE draft_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Versiones visibles para equipo"
  ON draft_versions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Artista y productor pueden crear versiones"
  ON draft_versions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

-- ===========================================
-- 7. PROJECTS (Albums, EP, Mixtapes)
-- ===========================================
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'album'
    CHECK (type IN ('album', 'ep', 'mixtape', 'single')),
  status TEXT NOT NULL DEFAULT 'idea'
    CHECK (status IN ('idea', 'en_produccion', 'en_mezcla', 'master', 'listo', 'publicado')),
  description TEXT,
  target_date TIMESTAMPTZ,
  cover_art_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proyectos visibles para equipo"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista puede gestionar proyectos"
  ON projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 8. PROJECT TRACKS (Tracklist)
-- ===========================================
CREATE TABLE project_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id),
  draft_id UUID REFERENCES drafts(id),
  track_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK ((song_id IS NOT NULL) OR (draft_id IS NOT NULL))
);

ALTER TABLE project_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks visibles para equipo"
  ON project_tracks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Artista puede gestionar tracks"
  ON project_tracks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 9. COMMENTS (Con timestamps de audio)
-- ===========================================
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID REFERENCES songs(id),
  draft_id UUID REFERENCES drafts(id),
  timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  CHECK ((song_id IS NOT NULL) OR (draft_id IS NOT NULL))
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentarios visibles para equipo"
  ON comments FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista y productor pueden comentar"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

CREATE POLICY "Autor puede editar sus comentarios"
  ON comments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Artista puede resolver comentarios"
  ON comments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 10. CALENDAR EVENTS
-- ===========================================
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'otro'
    CHECK (event_type IN ('lanzamiento', 'sesion_grabacion', 'evento_musical', 'reunion', 'otro')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  song_id UUID REFERENCES songs(id),
  project_id UUID REFERENCES projects(id),
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visibles para equipo"
  ON calendar_events FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista y manager pueden gestionar eventos"
  ON calendar_events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'manager'))
  );

-- ===========================================
-- 11. SOCIAL LINKS
-- ===========================================
CREATE TABLE social_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL
    CHECK (platform IN ('spotify', 'youtube', 'instagram', 'tiktok', 'soundcloud', 'twitter')),
  url TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Links visibles para equipo"
  ON social_links FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Artista puede gestionar links"
  ON social_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'artista')
  );

-- ===========================================
-- 12. SOCIAL STATS (Snapshots en el tiempo)
-- ===========================================
CREATE TABLE social_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  social_link_id UUID NOT NULL REFERENCES social_links(id) ON DELETE CASCADE,
  followers INTEGER,
  monthly_plays INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats visibles para equipo"
  ON social_stats FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Artista y manager pueden registrar stats"
  ON social_stats FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'manager'))
  );

-- ===========================================
-- 13. DRIVE FILES (Cache de metadata)
-- ===========================================
CREATE TABLE drive_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  drive_folder_path TEXT,
  web_view_link TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drive files visibles para equipo"
  ON drive_files FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Sistema puede gestionar drive files"
  ON drive_files FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('artista', 'productor'))
  );

-- ===========================================
-- FUNCIONES Y TRIGGERS
-- ===========================================

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_collaborations_updated_at BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_social_links_updated_at BEFORE UPDATE ON social_links FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- SEED: Primer usuario como artista
-- ===========================================
-- IMPORTANTE: Despues de que BERTIAKA se registre por primera vez,
-- ejecutar este UPDATE con su UUID real:
--
-- UPDATE profiles SET role = 'artista' WHERE email = 'bertiakapartners@gmail.com';
