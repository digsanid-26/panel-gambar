-- ============================================
-- Panel Gambar Bersuara - Migration V3
-- New: story visibility (public/private), admin RLS policies for stories
-- ============================================

-- 1. Add visibility column to stories
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- 2. Add admin policies for stories (admin can read/update/delete all stories)
-- Drop existing policies first to recreate them with admin access
DROP POLICY IF EXISTS "Published stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Authors can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can delete own stories" ON public.stories;

-- Recreated: viewable by everyone if published+public, or by author, or by admin
CREATE POLICY "Stories viewable by public or author or admin"
  ON public.stories FOR SELECT USING (
    (status = 'published' AND visibility = 'public')
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authors can update own stories, admins can update any story
CREATE POLICY "Authors and admins can update stories"
  ON public.stories FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authors can delete own stories, admins can delete any story
CREATE POLICY "Authors and admins can delete stories"
  ON public.stories FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
