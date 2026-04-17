-- ============================================
-- Panel Gambar Bersuara - Migration V2
-- New: video trailer, dynamic themes/levels/classes,
--      panel types (simple/complete), cover images bucket, videos bucket
-- ============================================

-- 1. Add video_trailer_url to stories
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS video_trailer_url text;

-- 2. Add panel_type and canvas_data to panels
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS panel_type text NOT NULL DEFAULT 'simple' CHECK (panel_type IN ('simple', 'complete'));
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS canvas_data jsonb;

-- 3. Remove CHECK constraint on stories.level to allow dynamic levels
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_level_check;

-- ============================================
-- THEMES (dynamic)
-- ============================================
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes viewable by everyone"
  ON public.themes FOR SELECT USING (true);

CREATE POLICY "Admins can manage themes"
  ON public.themes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage themes"
  ON public.themes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Teachers can update themes"
  ON public.themes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Seed default themes
INSERT INTO public.themes (name, label, sort_order) VALUES
  ('umum', 'Umum', 0),
  ('kehidupan-sehari-hari', 'Kehidupan Sehari-hari', 1),
  ('keluarga', 'Keluarga & Persahabatan', 2),
  ('sekolah', 'Lingkungan Sekolah', 3),
  ('hewan-alam', 'Hewan & Alam', 4),
  ('cerita-rakyat', 'Cerita Rakyat & Fabel', 5),
  ('petualangan', 'Petualangan', 6),
  ('sains', 'Sains Sederhana', 7),
  ('profesi', 'Profesi & Cita-cita', 8),
  ('budaya', 'Budaya Indonesia', 9),
  ('moral', 'Nilai Moral & Karakter', 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- LEVELS (dynamic)
-- ============================================
CREATE TABLE IF NOT EXISTS public.levels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Levels viewable by everyone"
  ON public.levels FOR SELECT USING (true);

CREATE POLICY "Admins can manage levels"
  ON public.levels FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can insert levels"
  ON public.levels FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Teachers can update levels"
  ON public.levels FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Seed default levels
INSERT INTO public.levels (name, label, description, sort_order) VALUES
  ('pemula', 'Pemula', 'Kelas 1 SD', 0),
  ('dasar', 'Dasar', 'Kelas 2 SD', 1),
  ('menengah', 'Menengah', 'Kelas 3-4 SD', 2),
  ('mahir', 'Mahir', 'Kelas 5-6 SD', 3),
  ('smp-awal', 'SMP Awal', 'Kelas 7-8 SMP', 4),
  ('smp-akhir', 'SMP Akhir', 'Kelas 9 SMP', 5),
  ('sma', 'SMA', 'Kelas 10-12 SMA', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TARGET CLASSES (dynamic)
-- ============================================
CREATE TABLE IF NOT EXISTS public.target_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.target_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Target classes viewable by everyone"
  ON public.target_classes FOR SELECT USING (true);

CREATE POLICY "Admins can manage target_classes"
  ON public.target_classes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can insert target_classes"
  ON public.target_classes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

CREATE POLICY "Teachers can update target_classes"
  ON public.target_classes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'guru')
  );

-- Seed default target classes
INSERT INTO public.target_classes (name, label, description, sort_order) VALUES
  ('kelas-1-2', 'Kelas 1-2', 'Fase A (SD)', 0),
  ('kelas-3-4', 'Kelas 3-4', 'Fase B (SD)', 1),
  ('kelas-5-6', 'Kelas 5-6', 'Fase C (SD)', 2),
  ('kelas-7-8', 'Kelas 7-8', 'Fase D (SMP)', 3),
  ('kelas-9', 'Kelas 9', 'Fase D Akhir (SMP)', 4),
  ('kelas-10-12', 'Kelas 10-12', 'Fase E-F (SMA)', 5),
  ('semua', 'Semua Kelas', 'Untuk semua jenjang', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS for cover images and videos
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('cover-images', 'cover-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO NOTHING;

-- Cover images policies
CREATE POLICY "Authenticated users can upload cover images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cover-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view cover images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cover-images');

CREATE POLICY "Users can delete own cover images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cover-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Videos policies
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
