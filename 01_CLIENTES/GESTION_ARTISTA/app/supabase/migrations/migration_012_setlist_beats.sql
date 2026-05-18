-- Migration 012: Setlist Beats
-- Allows uploading beat audio files and attaching them to setlists
-- Run this in Supabase SQL Editor

-- ─── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.setlist_beats (
  id               uuid primary key default gen_random_uuid(),
  setlist_id       uuid not null references public.setlists(id) on delete cascade,
  title            text not null,
  audio_url        text not null,           -- public Supabase Storage URL
  file_path        text,                    -- storage path (for deletion)
  duration_seconds int,
  bpm              int,
  beat_order       int not null default 1,
  created_at       timestamptz default now() not null,
  created_by       uuid references public.profiles(id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.setlist_beats enable row level security;

-- Authenticated users can read all beats
create policy "setlist_beats_select"
  on public.setlist_beats for select
  using (auth.role() = 'authenticated');

-- Authenticated users can insert their own beats
create policy "setlist_beats_insert"
  on public.setlist_beats for insert
  with check (auth.uid() = created_by);

-- Authenticated users can update their own beats
create policy "setlist_beats_update"
  on public.setlist_beats for update
  using (auth.uid() = created_by);

-- Authenticated users can delete their own beats
create policy "setlist_beats_delete"
  on public.setlist_beats for delete
  using (auth.uid() = created_by);

-- ─── Index ────────────────────────────────────────────────────────────────────
create index if not exists setlist_beats_setlist_id_idx on public.setlist_beats (setlist_id);

-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Run this separately in Supabase Storage or via the dashboard:
--
-- insert into storage.buckets (id, name, public)
-- values ('setlist-beats', 'setlist-beats', true)
-- on conflict (id) do nothing;
--
-- create policy "setlist_beats_storage_select"
--   on storage.objects for select
--   using (bucket_id = 'setlist-beats');
--
-- create policy "setlist_beats_storage_insert"
--   on storage.objects for insert
--   with check (bucket_id = 'setlist-beats' and auth.role() = 'authenticated');
--
-- create policy "setlist_beats_storage_delete"
--   on storage.objects for delete
--   using (bucket_id = 'setlist-beats' and auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Also ensure avatars bucket exists (for Mi Perfil photo upload) ──────────
-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true)
-- on conflict (id) do nothing;
--
-- create policy "avatars_select" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "avatars_insert" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
-- create policy "avatars_update" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
