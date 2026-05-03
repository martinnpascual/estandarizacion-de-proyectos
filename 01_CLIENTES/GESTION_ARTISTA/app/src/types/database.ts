// Tipos generados para Supabase — GESTION ARTISTA
// Estos tipos reflejan el esquema de la base de datos

export type UserRole = "artista" | "productor" | "manager";

export type DraftStatus =
  | "borrador"
  | "en_mezcla"
  | "masterizada"
  | "lista_para_publicar";

export type CollabStatus =
  | "propuesta_enviada"
  | "en_grabacion"
  | "recibido"
  | "mezclando"
  | "listo";

export type ProjectType = "album" | "ep" | "mixtape" | "single";

export type ProjectStatus =
  | "idea"
  | "en_produccion"
  | "en_mezcla"
  | "master"
  | "listo"
  | "publicado";

export type CalendarEventType =
  | "lanzamiento"
  | "sesion_grabacion"
  | "evento_musical"
  | "reunion"
  | "otro";

export type SocialPlatform =
  | "spotify"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "soundcloud"
  | "twitter";

// --- Entidades de la base de datos ---

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  artist_slug: string | null;
  bio: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Song {
  id: string;
  title: string;
  artist_name: string;
  featuring: string[];
  year: number;
  genre: string | null;
  duration_seconds: number | null;
  bpm: number | null;
  key_signature: string | null;
  cover_art_url: string | null;
  drive_file_id: string | null;
  drive_file_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  apple_music_url: string | null;
  soundcloud_url: string | null;
  tags: string[];
  lyrics: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Draft {
  id: string;
  title: string;
  producer: string | null;
  status: DraftStatus;
  drive_file_id: string | null;
  drive_file_url: string | null;
  cover_art_url: string | null;
  notes: string | null;
  lyrics: string | null;
  bpm: number | null;
  key_signature: string | null;
  collaboration_id: string | null;
  month_created: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface DraftVersion {
  id: string;
  draft_id: string;
  version_number: number;
  drive_file_id: string;
  drive_file_url: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  // HIGH-03: Campos de soft-delete alineados con schema
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Collaboration {
  id: string;
  artist_name: string;
  song_title: string;
  status: CollabStatus;
  deadline: string | null;
  notes: string | null;
  // HIGH-02: Removido draft_id — no existe en schema SQL
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  target_date: string | null;
  cover_art_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface ProjectTrack {
  id: string;
  project_id: string;
  song_id: string | null;
  draft_id: string | null;
  track_order: number;
  created_at: string;
  // HIGH-03: Campos de soft-delete
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Comment {
  id: string;
  song_id: string | null;
  draft_id: string | null;
  timestamp_seconds: number;
  body: string;
  is_resolved: boolean;
  parent_id: string | null;
  created_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  // Joined fields
  author?: Profile;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  song_id: string | null;
  project_id: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  username: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // HIGH-03: Campos de soft-delete
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface SocialStat {
  id: string;
  social_link_id: string;
  followers: number | null;
  monthly_plays: number | null;
  recorded_at: string;
  created_at: string;
  // HIGH-03: Campos de soft-delete
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  accepted: boolean;
  created_at: string;
  is_deleted: boolean;
  // HIGH-03: Campos de soft-delete
  deleted_at?: string | null;
  deleted_by?: string | null;
}

// ─── Royalties / Ingresos ─────────────────────────────────────────────────────
export type RoyaltySource =
  | "spotify"
  | "youtube"
  | "apple_music"
  | "tidal"
  | "amazon_music"
  | "soundcloud"
  | "directo"
  | "sync"
  | "otro";

export interface RoyaltyPayment {
  id: string;
  source: RoyaltySource;
  amount: number;           // en la moneda del usuario
  currency: string;         // "USD", "EUR", "ARS", etc.
  period_month: string;     // "YYYY-MM"
  song_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ─── Metas / Goals ────────────────────────────────────────────────────────────
export type GoalCategory =
  | "streams"
  | "seguidores"
  | "lanzamientos"
  | "ingresos"
  | "colaboraciones"
  | "otro";

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  target_value: number;
  current_value: number;
  target_date: string | null;   // ISO date "YYYY-MM-DD"
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ─── Release Checklist ────────────────────────────────────────────────────────
export interface ReleaseChecklistItem {
  id: string;
  calendar_event_id: string;
  task: string;
  is_done: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}
