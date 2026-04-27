-- Migration v7: Source Manager (Asset Library)
-- Stores reusable assets (images, audio, video, 3d models, avatars, etc.) per user.
-- Visibility: 'private' = only owner; 'public' = readable by all signed-in users.

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM ('avatar', 'image', 'video', 'audio', 'model_3d', 'document', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_visibility AS ENUM ('private', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type asset_type NOT NULL,
  url text NOT NULL,
  storage_path text,
  storage_bucket text DEFAULT 'assets',
  thumbnail_url text,
  mime_type text,
  size_bytes bigint,
  visibility asset_visibility NOT NULL DEFAULT 'private',
  tags text[] DEFAULT '{}'::text[],
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_owner_idx ON assets(owner_id);
CREATE INDEX IF NOT EXISTS assets_type_idx ON assets(type);
CREATE INDEX IF NOT EXISTS assets_visibility_idx ON assets(visibility);
CREATE INDEX IF NOT EXISTS assets_tags_idx ON assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS assets_created_idx ON assets(created_at DESC);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION assets_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_updated_at ON assets;
CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION assets_set_updated_at();

-- 4) RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select" ON assets;
CREATE POLICY "assets_select" ON assets
  FOR SELECT
  USING (auth.uid() = owner_id OR visibility = 'public');

DROP POLICY IF EXISTS "assets_insert" ON assets;
CREATE POLICY "assets_insert" ON assets
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "assets_update" ON assets;
CREATE POLICY "assets_update" ON assets
  FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "assets_delete" ON assets;
CREATE POLICY "assets_delete" ON assets
  FOR DELETE
  USING (auth.uid() = owner_id);

-- 5) Storage bucket (public read so urls work; writes still gated by policies below)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- 6) Storage policies for the 'assets' bucket
-- Path convention: <owner_uuid>/<filename>
DROP POLICY IF EXISTS "assets_storage_select" ON storage.objects;
CREATE POLICY "assets_storage_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'assets');

DROP POLICY IF EXISTS "assets_storage_insert" ON storage.objects;
CREATE POLICY "assets_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "assets_storage_update" ON storage.objects;
CREATE POLICY "assets_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "assets_storage_delete" ON storage.objects;
CREATE POLICY "assets_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON TABLE assets IS 'Source Manager: reusable assets uploaded by teachers. Visibility controls cross-user sharing.';
