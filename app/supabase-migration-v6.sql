-- Migration v6: Add Kurikulum Merdeka fields to stories

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS capaian_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS tujuan_pembelajaran TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pertanyaan_pemantik TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS alokasi_waktu TEXT,
  ADD COLUMN IF NOT EXISTS kata_kunci TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS asesmen_jenis TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS asesmen_deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS refleksi_siswa TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS refleksi_guru TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sumber_belajar JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS glosarium JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metode_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS materi_pokok TEXT,
  ADD COLUMN IF NOT EXISTS pendekatan_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS evaluasi_guru TEXT,
  ADD COLUMN IF NOT EXISTS link_quiz TEXT;

COMMENT ON COLUMN stories.capaian_pembelajaran IS 'Capaian Pembelajaran (CP) — free text';
COMMENT ON COLUMN stories.tujuan_pembelajaran IS 'Tujuan Pembelajaran (TP) — ordered list';
COMMENT ON COLUMN stories.pertanyaan_pemantik IS 'Pertanyaan Pemantik — ordered list';
COMMENT ON COLUMN stories.alokasi_waktu IS 'Alokasi Waktu (e.g. 2 JP x 35 menit)';
COMMENT ON COLUMN stories.kata_kunci IS 'Kata Kunci — tag list';
COMMENT ON COLUMN stories.asesmen_jenis IS 'Jenis Asesmen — multi-select (Diagnostik/Formatif/Sumatif)';
COMMENT ON COLUMN stories.asesmen_deskripsi IS 'Deskripsi Asesmen — free text';
COMMENT ON COLUMN stories.refleksi_siswa IS 'Pertanyaan refleksi untuk siswa — ordered list';
COMMENT ON COLUMN stories.refleksi_guru IS 'Pertanyaan refleksi untuk guru — ordered list';
COMMENT ON COLUMN stories.sumber_belajar IS 'Sumber Belajar Tambahan — array of {judul, url}';
COMMENT ON COLUMN stories.glosarium IS 'Glosarium — array of {istilah, definisi}';
COMMENT ON COLUMN stories.metode_pembelajaran IS 'Metode/Model Pembelajaran (Discovery, PBL, dll)';
COMMENT ON COLUMN stories.materi_pokok IS 'Materi Pokok — textarea';
COMMENT ON COLUMN stories.pendekatan_pembelajaran IS 'Pendekatan Pembelajaran — textarea';
COMMENT ON COLUMN stories.evaluasi_guru IS 'Rangkuman / evaluasi guru terhadap proses belajar mengajar';
COMMENT ON COLUMN stories.link_quiz IS 'URL eksternal ke quiz / pelatihan (Google Form, Quizizz, dll)';
