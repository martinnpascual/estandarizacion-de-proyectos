-- Migration 015: User preferences + onboarding flag
-- Adds a JSONB preferences column to profiles for storing
-- dashboard widget config, UI preferences, etc.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Index for faster lookups (optional — small table)
COMMENT ON COLUMN profiles.preferences IS
  'User-specific UI preferences: dashboard widget order/visibility, activity filter, etc.';
