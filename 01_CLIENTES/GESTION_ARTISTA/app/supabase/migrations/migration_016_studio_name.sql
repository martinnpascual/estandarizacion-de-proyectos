-- migration_016_studio_name
-- Adds studio_name to profiles so each artist can brand their login page
-- Default is 'Studio' to match existing behaviour

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS studio_name TEXT DEFAULT 'Studio';

-- Update existing rows that have NULL so they get the default label
UPDATE profiles
SET studio_name = 'Studio'
WHERE studio_name IS NULL;
