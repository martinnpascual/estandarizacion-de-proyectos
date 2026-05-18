-- Migration 013: Invite Tokens
-- Adds a shareable token to team_invitations so the artist can
-- copy a direct invite link instead of relying on email delivery.
-- Run this in Supabase SQL Editor

-- ─── Add columns ─────────────────────────────────────────────────────────────

alter table public.team_invitations
  add column if not exists invite_token      uuid default gen_random_uuid(),
  add column if not exists invite_token_expires_at timestamptz default (now() + interval '72 hours');

-- ─── Back-fill existing pending invitations ──────────────────────────────────
-- Give older rows a token + 72 h window from their creation date.

update public.team_invitations
set
  invite_token               = gen_random_uuid(),
  invite_token_expires_at    = created_at + interval '72 hours'
where invite_token is null
  and is_deleted = false
  and accepted   = false;

-- ─── Unique index (allows NULLs, enforces uniqueness on non-NULLs) ────────────

create unique index if not exists team_invitations_invite_token_idx
  on public.team_invitations (invite_token)
  where invite_token is not null;

-- ─── Public read policy for token lookup ─────────────────────────────────────
-- Unauthenticated users need to read the invitation by token to render
-- the public /invite/[token] landing page.

create policy "team_invitations_token_select"
  on public.team_invitations
  for select
  using (invite_token is not null);
