-- Migration 014: Goals — Platform URL + Auto-Update
-- Adds an optional URL to link a goal to a YouTube channel or video,
-- and an auto_update flag so the daily cron can refresh current_value.
-- Run this in Supabase SQL Editor

alter table public.goals
  add column if not exists platform_url text,          -- e.g. youtube.com/@BertiAKA or youtu.be/abc123
  add column if not exists auto_update  boolean not null default false;

-- Index for the cron job: only touch rows that opted in
create index if not exists goals_auto_update_idx
  on public.goals (created_by)
  where auto_update = true;
