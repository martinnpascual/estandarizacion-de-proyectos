/**
 * Schemas Zod compartidos entre Server Actions y Client Components.
 * NO tiene "use server" — puede importarse desde el cliente.
 */
import { z } from "zod";

// ─── Songs ────────────────────────────────────────────────────────────────────
export const SongSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  artist_name: z.string().min(1, "El artista es requerido"),
  featuring: z.array(z.string()).default([]),
  year: z.number().int().min(1900).max(2100),
  genre: z.string().nullable().default(null),
  duration_seconds: z.number().int().positive().nullable().default(null),
  bpm: z.number().int().min(1).max(300).nullable().default(null),
  key_signature: z.string().nullable().default(null),
  // cover_art_url puede ser URL absoluta (https://...) o ruta relativa (/api/drive/stream/xxx)
  cover_art_url: z.string().nullable().default(null),
  drive_file_id: z.string().nullable().default(null),
  drive_file_url: z.string().nullable().default(null),
  spotify_url: z.string().url("URL de Spotify inválida").nullable().default(null),
  youtube_url: z.string().url("URL de YouTube inválida").nullable().default(null),
  apple_music_url: z.string().url("URL de Apple Music inválida").nullable().default(null),
  soundcloud_url: z.string().url("URL de SoundCloud inválida").nullable().default(null),
  tags: z.array(z.string()).default([]),
  lyrics: z.string().nullable().default(null),
  isrc: z.string().nullable().default(null),
  pro_registration: z.string().nullable().default(null),
});
export type SongFormData = z.infer<typeof SongSchema>;

// ─── Drafts ───────────────────────────────────────────────────────────────────
export const DraftSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  producer: z.string().nullable().default(null),
  status: z.enum([
    "borrador",
    "en_mezcla",
    "masterizada",
    "lista_para_publicar",
  ]),
  drive_file_id: z.string().nullable().default(null),
  drive_file_url: z.string().nullable().default(null),
  cover_art_url: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  bpm: z.number().int().min(1).max(300).nullable().default(null),
  key_signature: z.string().nullable().default(null),
  month_created: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM requerido")
    .default(() => new Date().toISOString().slice(0, 7)),
});
export type DraftFormData = z.infer<typeof DraftSchema>;

// ─── Collabs ──────────────────────────────────────────────────────────────────
export const CollabSchema = z.object({
  artist_name: z.string().min(1, "El nombre del artista es requerido"),
  song_title: z.string().min(1, "El título de la canción es requerido"),
  status: z.enum([
    "propuesta_enviada",
    "en_grabacion",
    "recibido",
    "mezclando",
    "listo",
  ]),
  deadline: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type CollabFormData = z.infer<typeof CollabSchema>;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const ProjectSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  type: z.enum(["album", "ep", "mixtape", "single"]),
  status: z.enum(["idea", "en_produccion", "en_mezcla", "master", "listo", "publicado"]),
  description: z.string().nullable().default(null),
  target_date: z.string().nullable().default(null),
  cover_art_url: z.string().nullable().default(null),
});
export type ProjectFormData = z.infer<typeof ProjectSchema>;

// ─── Calendar Events ──────────────────────────────────────────────────────────
export const CalendarEventSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(120),
  description: z.string().nullable().default(null),
  event_type: z.enum(["lanzamiento", "sesion_grabacion", "evento_musical", "reunion", "otro"]),
  start_date: z.string().min(1, "La fecha es requerida"),
  end_date: z.string().nullable().default(null),
  all_day: z.boolean().default(true),
  song_id: z.string().uuid().nullable().default(null),
  project_id: z.string().uuid().nullable().default(null),
});
export type CalendarEventFormData = z.infer<typeof CalendarEventSchema>;

// ─── Social Links ─────────────────────────────────────────────────────────────
export const SocialLinkSchema = z.object({
  platform: z.enum(["spotify", "youtube", "instagram", "tiktok"]),
  url: z.string().url("URL inválida"),
  username: z.string().nullable().default(null),
});
export type SocialLinkFormData = z.infer<typeof SocialLinkSchema>;

export const SocialStatSchema = z.object({
  social_link_id: z.string().uuid(),
  followers: z.number().int().min(0).nullable().default(null),
  monthly_plays: z.number().int().min(0).nullable().default(null),
});
export type SocialStatFormData = z.infer<typeof SocialStatSchema>;

// ─── Comments ─────────────────────────────────────────────────────────────────
export const CommentSchema = z.object({
  content: z.string().min(1, "El comentario no puede estar vacío").max(1000),
  entity_type: z.enum(["draft", "song", "project", "collab"]),
  entity_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().default(null),
});
export type CommentFormData = z.infer<typeof CommentSchema>;

// ─── Profile ──────────────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  display_name: z.string().min(1, "El nombre es requerido").max(80),
  bio: z.string().max(500).nullable().default(null),
  avatar_url: z.string().url().nullable().default(null),
});
export type ProfileFormData = z.infer<typeof ProfileSchema>;

// ─── Team / Invite ────────────────────────────────────────────────────────────
export const InviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "productor", "manager", "colaborador"]),
});
export type InviteFormData = z.infer<typeof InviteSchema>;

// ─── Royalty Payments ─────────────────────────────────────────────────────────
export const RoyaltyPaymentSchema = z.object({
  source: z.enum([
    "spotify",
    "youtube",
    "apple_music",
    "tidal",
    "amazon_music",
    "soundcloud",
    "directo",
    "sync",
    "otro",
  ]),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().min(1).max(3).default("USD"),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM requerido"),
  song_id: z.string().uuid().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type RoyaltyPaymentFormData = z.infer<typeof RoyaltyPaymentSchema>;

// ─── Goals / Metas ────────────────────────────────────────────────────────────
export const GoalSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(120),
  category: z.enum([
    "streams",
    "seguidores",
    "lanzamientos",
    "ingresos",
    "colaboraciones",
    "otro",
  ]),
  target_value: z.number().positive("El objetivo debe ser mayor a 0"),
  current_value: z.number().min(0).default(0),
  target_date: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  // Auto-update via cron (migration_014)
  platform_url: z.string().url("URL inválida").nullable().default(null).or(z.literal("").transform(() => null)),
  auto_update: z.boolean().default(false),
});
export type GoalFormData = z.infer<typeof GoalSchema>;

// ─── Release Checklist ────────────────────────────────────────────────────────
export const ChecklistItemSchema = z.object({
  calendar_event_id: z.string().uuid(),
  task: z.string().min(1, "La tarea es requerida").max(200),
  due_date: z.string().nullable().default(null),
});
export type ChecklistItemFormData = z.infer<typeof ChecklistItemSchema>;
