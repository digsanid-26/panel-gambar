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

-- ============================================
-- Migration V2.1: Display mode for stories
-- ============================================
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS display_mode text DEFAULT 'slide';

-- ============================================
-- Migration V2.2: Characters + Panel timeline
-- ============================================
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS characters jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS timeline_data jsonb DEFAULT '[]'::jsonb;

-- ============================================
-- Migration V2.3: App settings (key-value store)
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Only admins and teachers can update app_settings"
  ON public.app_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'guru'))
  );

-- Seed default
INSERT INTO public.app_settings (key, value) VALUES ('google_auth_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Migration V2.4: Narration overlay on panels
-- ============================================
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS narration_overlay jsonb DEFAULT NULL;

-- ============================================
-- Migration V2.5: Schools (teacher school profile)
-- ============================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text,
  province text,
  postal_code text,
  phone text,
  logo_url text,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools viewable by authenticated users"
  ON public.schools FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can create own school"
  ON public.schools FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own school"
  ON public.schools FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own school"
  ON public.schools FOR DELETE USING (auth.uid() = teacher_id);

-- Link profile to school
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- Link classrooms to school
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- ============================================
-- Migration V2.6: Managed students (teacher-created)
-- ============================================
CREATE TABLE IF NOT EXISTS public.managed_students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  username text NOT NULL,
  email text,
  class_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, username)
);

ALTER TABLE public.managed_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managed students viewable by teacher and linked user"
  ON public.managed_students FOR SELECT USING (
    auth.uid() = teacher_id OR auth.uid() = user_id
  );

CREATE POLICY "Teachers can create managed students"
  ON public.managed_students FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update managed students"
  ON public.managed_students FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete managed students"
  ON public.managed_students FOR DELETE USING (auth.uid() = teacher_id);

-- ============================================
-- Migration V2.7: Story recording mode + recording status
-- ============================================
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS recording_mode text DEFAULT 'manual';
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS auto_active boolean DEFAULT false;
ALTER TABLE public.recordings ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- ============================================
-- Migration V2.8: Element assets (element manager)
-- ============================================
CREATE TABLE IF NOT EXISTS public.element_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  panel_id uuid REFERENCES public.panels(id) ON DELETE SET NULL,
  dialog_id uuid REFERENCES public.dialogs(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'file' CHECK (type IN ('image', 'audio', 'recording', 'file')),
  label text NOT NULL DEFAULT '',
  url text NOT NULL,
  source text NOT NULL DEFAULT 'upload',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.element_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Element assets viewable by story author and performers"
  ON public.element_assets FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories WHERE id = story_id AND (author_id = auth.uid() OR status = 'published')
    )
  );

CREATE POLICY "Authors can manage element assets"
  ON public.element_assets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND author_id = auth.uid())
    OR auth.uid() = created_by
  );

CREATE POLICY "Authors can update element assets"
  ON public.element_assets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND author_id = auth.uid())
  );

CREATE POLICY "Authors can delete element assets"
  ON public.element_assets FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND author_id = auth.uid())
  );
