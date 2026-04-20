-- ============================================
-- Panel Gambar Bersuara - Migration V4
-- New: additional story metadata fields (kurikulum, mata_pelajaran, semester, sumber_cerita, etc.)
-- ============================================

-- 1. Add kurikulum column
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS kurikulum text;

-- 2. Add mata_pelajaran column
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS mata_pelajaran text;

-- 3. Add semester column
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS semester text;

-- 4. Add sumber_cerita column (Karangan sendiri, Buku, Novel Online, Film, dll)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS sumber_cerita text;

-- 5. Add detail_sumber column (nama buku, film, novel, seri, dll)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS detail_sumber text;

-- 6. Add informasi_tambahan column (free-form textarea)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS informasi_tambahan text;
