-- Migration 002: Add Google OAuth columns to profiles table
-- These columns are required for Google Drive and Google Calendar integrations
-- Referenced in: src/types/database.ts, src/app/api/drive/files/route.ts, src/app/api/calendar/sync/route.ts

-- Add Google OAuth token storage columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN profiles.google_access_token  IS 'Google OAuth2 access token for Drive/Calendar API calls';
COMMENT ON COLUMN profiles.google_refresh_token IS 'Google OAuth2 refresh token (long-lived, used to renew access token)';
COMMENT ON COLUMN profiles.google_token_expiry  IS 'Expiry timestamp of the current access token';

-- RLS: users can only read/update their own token columns (same policy as the profiles table)
-- The existing profiles RLS policies already cover these new columns since they apply to the full row.
-- No additional policies needed.
