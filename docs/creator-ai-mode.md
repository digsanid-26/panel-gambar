# Creator-AI Mode — Peta Integrasi & Rencana Implementasi

> **Dokumen ini** merupakan hasil penelusuran menyeluruh terhadap sistem aplikasi **padu.digsan.id** (Panel Gambar Bersuara) dengan tujuan mengidentifikasi semua titik di mana kemampuan AI bisa disematkan untuk mempermudah proses kreatif guru dan tim konten.

---

## 1. Gambaran Umum

### Apa itu Mode Creator-AI?

**Creator-AI Mode** adalah fitur opsional yang dapat diaktifkan oleh admin melalui `/admin/settings`. Ketika aktif, berbagai elemen di halaman authoring (pembuatan cerita) akan mendapatkan tambahan kontrol AI — berupa field prompt/petunjuk dan tombol Generate — sehingga guru atau tim kreator dapat:

- Men-generate teks (judul, deskripsi, dialog, narasi, soal refleksi, dsb.)
- Men-generate gambar (cover cerita, latar, avatar karakter, ilustrasi panel)
- Men-generate video trailer singkat
- Men-generate audio (suara latar, placeholder dialog)
- Mendapat saran otomatis untuk metadata Kurikulum Merdeka

Fitur ini bersifat **non-destruktif** — semua output AI hanya muncul sebagai *saran* dan bisa diterima, diedit, atau diabaikan oleh kreator.

> Akses Creator-AI diatur per-user melalui role dan status subscription. Lihat **Section 12** untuk model akses lengkap dan **Section 13** untuk halaman Upgrade & Pricing.

---

## 2. Arsitektur Aplikasi — Referensi Cepat

| Route / Komponen | File | Deskripsi |
|---|---|---|
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Halaman pengaturan fitur global |
| `/stories/create` | `src/app/stories/create/page.tsx` | Form membuat cerita baru |
| `/stories/[id]/edit` | `src/app/stories/[id]/edit/page.tsx` | Editor cerita lengkap (panel, dialog, narasi, karakter) |
| `/stories/assets` | `src/app/stories/assets/page.tsx` | Source Manager — kelola aset |
| `AssetPickerModal` | `src/components/asset-library/asset-picker-modal.tsx` | Modal "Pilih Gambar dari Galeri" |
| `CoverImageUploader` | `src/components/ui/cover-image-uploader.tsx` | Uploader cover cerita |
| `CharacterManager` | `src/components/story-editor/character-manager.tsx` | Manajemen karakter cerita |
| `PanelTimelineEditor` | `src/components/story-editor/panel-timeline-editor.tsx` | Editor panel dengan timeline |
| `SimplePanelEditor` | `src/components/story-editor/simple-panel-editor.tsx` | Editor panel sederhana |
| `KurikulumMerdekaSection` | `src/components/story-editor/kurikulum-merdeka-section.tsx` | Field CP, TP, Kata Kunci, dll. |
| `/api/settings` | `src/app/api/settings/route.ts` | API key-value settings (Prisma) |
| `AudioRecorder` | `src/components/audio/audio-recorder.tsx` | Rekaman audio di browser |

---

## 3. Pengaturan Creator-AI di `/admin/settings`

### 3.1 Tambahan pada `SETTINGS_CONFIG`

Berikut adalah entri-entri baru yang perlu ditambahkan ke `SETTINGS_CONFIG` di `admin/settings/page.tsx`:

```ts
// Toggle utama mode
{ key: "creator_ai_enabled",          label: "Mode Creator-AI", description: "..." }

// Sub-fitur (hanya aktif jika creator_ai_enabled = true)
{ key: "creator_ai_image_gen",        label: "AI: Generate Gambar", description: "..." }
{ key: "creator_ai_video_gen",        label: "AI: Generate Video Trailer", description: "..." }
{ key: "creator_ai_text_gen",         label: "AI: Generate Teks", description: "..." }
{ key: "creator_ai_kurikulum_gen",    label: "AI: Bantu Kurikulum Merdeka", description: "..." }
```

### 3.2 Pengaturan Provider AI

Karena pengaturan provider membutuhkan input teks (bukan toggle), perlu ada **section terpisah** di halaman settings dengan komponen `SettingTextInput` dan `SettingSelect`. Data yang disimpan di tabel `app_settings` (key-value):

| Key | Tipe | Keterangan |
|---|---|---|
| `ai_provider` | string | ID provider aktif (contoh: `aklaude`) |
| `ai_api_base_url` | string | Base URL endpoint proxy |
| `ai_api_key` | string | API key (disimpan terenkripsi / env var, jangan plain text di DB) |
| `ai_text_model` | string | Model untuk teks (contoh: `claude-sonnet-4-6`) |
| `ai_image_model` | string | Model untuk image gen (contoh: `nano-banana-pro`) |
| `ai_video_model` | string | Model untuk video gen (contoh: `veo-3.1-fast`) |

> ⚠️ **Keamanan:** `ai_api_key` sebaiknya **tidak** disimpan di database publik. Simpan di `.env` server sebagai `AI_API_KEY` dan hanya expose key yang aktif via setting dropdown provider, bukan API key-nya sendiri.

### 3.3 Daftar Provider AI yang Didukung (awal)

```ts
const AI_PROVIDERS = [
  {
    id: "aklaude",
    label: "aKlaude (Claude via Proxy)",
    baseUrl: "https://api.aklaude.xyz/api/proxy",
    textModels: [
      { id: "claude-haiku-4-5",  label: "Claude Haiku 4.5 (Cepat & Hemat)" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Seimbang)" },
      { id: "claude-opus-4-7",   label: "Claude Opus 4.7 (Kuat)" },
      { id: "claude-opus-4-8",   label: "Claude Opus 4.8 (Terkuat)" },
    ],
    imageModels: [
      { id: "nano-banana-pro", label: "Nano Banana Pro (€0.03/gambar)" },
      { id: "nano-banana-2",   label: "Nano Banana 2 (€0.03/gambar)" },
    ],
    videoModels: [
      { id: "veo-3.1-fast", label: "Veo 3.1 Fast (€0.40/8s, dengan audio)" },
      { id: "veo-3.1",      label: "Veo 3.1 (€1.50/8s, dengan audio)" },
      { id: "veo-3-fast",   label: "Veo 3 Fast (€0.40/8s, dengan audio)" },
      { id: "veo-3",        label: "Veo 3 (€1.50/8s, dengan audio)" },
      { id: "veo-2",        label: "Veo 2 (€1.80/8s, tanpa audio)" },
    ],
    supportsImageGen: true,
    supportsVideoGen: true,
  },
  // Provider lain dapat ditambahkan di sini (OpenAI, Gemini, Groq, dsb.)
];
```

---

## 4. Peta Integrasi AI — Per Halaman & Komponen

### 4.1 `/stories/create` — Buat Cerita Baru

**Titik integrasi:**

| Field / Elemen | Jenis AI | Deskripsi |
|---|---|---|
| Judul Cerita | Teks | Generate judul berdasarkan tema/kelas/mata pelajaran yang sudah diisi |
| Deskripsi Singkat | Teks | Generate sinopsis cerita dari judul + tema |
| Cover Cerita | Gambar | Tombol "Generate dengan AI" di samping tombol Upload dan Galeri — user isi prompt, AI generate gambar via imagegen API |
| Video Trailer | Video | Tombol "Generate Trailer AI" — user isi prompt/skrip, AI generate clip via videogen API |
| Informasi Tambahan | Teks | Saran konten tambahan berdasarkan konteks cerita |
| Kurikulum & Mata Pelajaran | Teks | Saran kata kunci relevan dari kurikulum yang dipilih |

**Tampilan UI yang diusulkan untuk field teks:**

```
[ Judul Cerita _______________________ ] [✨ Generate]
```

Saat tombol Generate diklik, muncul mini-panel di bawah field:
```
Petunjuk untuk AI: [_____________________________]
                   [Generate]   [Gunakan]   [Tutup]
```

**Tampilan UI untuk Cover Image dengan AI:**

Di komponen `CoverImageUploader`, di samping tombol "atau pilih dari Galeri", tambahkan:
```
[✨ Generate dengan AI]
```
→ membuka **modal AiImageGenerator** dengan:
- Textarea prompt/petunjuk
- Dropdown aspect ratio (3:2 untuk cover, 16:9, 1:1, dst.)
- Pilihan model (nano-banana-pro / nano-banana-2)
- Tombol Generate → tampilkan preview → Gunakan / Coba Lagi

---

### 4.2 `/stories/[id]/edit` — Editor Cerita

Ini adalah halaman terkompleks dengan banyak sub-editor. Rincian per bagian:

#### 4.2.1 Panel — Gambar Utama

Setiap panel memiliki area upload gambar. Tambahkan di sini:

```
[📤 Upload]  [🖼 Galeri]  [✨ AI Generate]
Petunjuk: [ isi deskripsi adegan di panel ini... ]
                                      [Generate]
```

Konteks yang bisa dikirim ke AI otomatis:
- Judul cerita
- Tema
- Narasi panel (jika sudah diisi)
- Nomor panel (urutan) untuk konteks kelanjutan cerita

#### 4.2.2 Dialog / Buble

Setiap dialog memiliki field teks. Tambahkan tombol kecil di sudut field:

```
[ Teks dialog karakter... ] [✨]
```

Klik `✨` → panel kecil muncul:
```
Konteks: Panel ke-3, Karakter: "Budi (Laki-laki)"
Petunjuk: [ "Budi kaget melihat kupu-kupu besar" ]
                                        [Generate]
Output: [ "Waah! Kupu-kupunya sebesar tanganku!" ]
                    [Gunakan]   [Coba Lagi]
```

Konteks otomatis dikirim ke AI:
- Nama karakter + gender
- Teks narasi panel ini
- Dialog sebelumnya (2-3 dialog terakhir sebagai konteks)
- Judul dan tema cerita

#### 4.2.3 Narasi Panel

Di editor narasi per panel, tambahkan tombol Generate Narasi:

```
Teks Narasi:
[ _________________________________________ ] [✨ Bantu AI]

Petunjuk ke AI: [ "Deskripsikan suasana hutan pagi hari" ]
                                               [Generate]
```

Konteks yang dikirim:
- Nomor panel + judul cerita
- Karakter yang ada di cerita
- Tema dan level

#### 4.2.4 Audio Narasi / Dialog (AI Text-to-Speech — Future)

> 🔮 **Untuk fase berikutnya:** Integrasikan provider TTS (misal ElevenLabs, Google TTS, atau `kokoro-tts`) agar guru bisa generate audio narasi dari teks yang sudah ditulis. Tombol "🔊 Generate Suara" di sebelah tombol Rekam.

#### 4.2.5 Karakter (`CharacterManager`)

Di form tambah/edit karakter:

```
Avatar:  [📤 Upload]  [✨ Generate Avatar AI]

Petunjuk: [ "Perempuan muda, berambut panjang, pakaian batik" ]
                                              [Generate]
```

Tambahkan tombol "Bantu AI" di field Deskripsi Karakter:

```
Deskripsi: [_______________]  [✨]
```

Klik → generate deskripsi karakter berdasarkan nama + gender + warna identitas.

#### 4.2.6 `KurikulumMerdekaSection` — Metadata Pembelajaran

Ini adalah titik yang paling strategis untuk AI karena mengisi field-field Kurikulum Merdeka sangat memakan waktu guru. Integrasi AI di sini:

| Field | AI Assist |
|---|---|
| Capaian Pembelajaran (CP) | Generate berdasarkan mata pelajaran + kelas |
| Tujuan Pembelajaran (TP) | Generate 3-5 TP dari CP yang sudah diisi |
| Pertanyaan Pemantik | Generate 3 pertanyaan pemantik dari judul + TP |
| Kata Kunci | Ekstrak/generate kata kunci dari konten cerita |
| Refleksi Siswa | Generate 3-5 pertanyaan refleksi untuk siswa |
| Refleksi Guru | Generate 3 pertanyaan refleksi untuk guru |
| Materi Pokok | Generate materi pokok dari CP + mata pelajaran |
| Pendekatan Pembelajaran | Sarankan pendekatan berdasarkan tema + level |
| Evaluasi Guru | Generate template evaluasi berbasis TP yang sudah diisi |

**Tampilan UI di `KurikulumMerdekaSection`:**

Tambahkan satu tombol besar di bagian atas section:
```
[✨ Isi Otomatis dengan AI]
```

Klik → modal **AiKurikulumAssistant** muncul, menampilkan:
- Review konteks (judul, kelas, mapel, semester, CP yang sudah ada)
- Tombol per-field: "Generate CP", "Generate TP", "Generate Pertanyaan Pemantik", dll.
- Tombol "Generate Semua Sekaligus" → isi semua field sekaligus, user bisa review sebelum apply

#### 4.2.7 Video Trailer di Story Editor

Di komponen `VideoTrailerUploader`, tambahkan tab ketiga:

```
[📤 Upload Video]  [✨ Generate dengan AI]
```

Tab Generate:
```
Skrip / Prompt:
[ "Trailer animasi cerita anak tentang kelinci rajin belajar, suasana desa, suara gembira" ]

Durasi: [8s ▼]   Rasio: [16:9 ▼]   Model: [Veo 3.1 Fast ▼]

                                    [Generate Trailer]
```

Setelah generate, tampilkan video preview + tombol "Gunakan sebagai Trailer".

---

### 4.3 `/stories/assets` — Source Manager

**Titik integrasi:**

#### 4.3.1 Tombol Generate Gambar AI

Tambahkan tombol di samping "Upload Aset":

```
[📤 Upload Aset]  [✨ Generate Gambar AI]
```

Klik → modal **AiImageGenerator** di Source Manager:
```
Prompt/Petunjuk:
[ "Latar belakang sawah di pagi hari, gaya ilustrasi anak" ]

Rasio:  [16:9 ▼]    Model: [nano-banana-pro ▼]
Jumlah: [1 ▼]

                              [Generate]
─────────────────────────────
[preview gambar 1]  [preview gambar 2]  ...
[Simpan ke Galeri]
```

Gambar yang di-generate akan langsung bisa disimpan sebagai `Asset` baru (type: `image`, visibility: `private`).

#### 4.3.2 Tombol Generate Avatar

Saat tab filter aktif `avatar`, tombol Generate berubah ke:

```
[📤 Upload Avatar]  [✨ Generate Avatar AI]
```

Dengan tambahan field reference image (opsional) untuk **image-to-image** editing karakter yang sudah ada.

#### 4.3.3 Auto-tag & Auto-deskripsi dengan AI Vision

Saat upload aset baru, di dialog `UploadDialog`, tambahkan:

```
[✨ Analisis dengan AI] → otomatis isi "Nama Aset", "Deskripsi", dan "Tag"
```

AI akan menganalisis gambar (via vision/multimodal) dan menyarankan metadata.

---

### 4.4 `AssetPickerModal` — "Pilih Gambar dari Galeri"

Modal ini muncul di banyak tempat (cover cerita, gambar panel, avatar karakter). Tambahkan tab/tombol baru:

```
[🔍 Cari]  [📤 Upload]  [✨ Generate AI]
```

Tab Generate AI di dalam modal:
```
Petunjuk:  [ "Ilustrasi anak laki-laki berlari di taman" ]
Rasio:     [sesuai konteks ▼]
                              [Generate]
─────────────────────────────────────────
[preview hasil 1]  [preview hasil 2]
          [Pilih]             [Pilih]
```

Dengan cara ini, guru tidak perlu meninggalkan alur kerja untuk generate gambar — semuanya bisa dilakukan langsung dari modal Galeri.

---

### 4.5 Dashboard Guru (Future)

| Fitur | AI Assist |
|---|---|
| Buat Cerita Baru (quick-start) | Wizard AI: isi tema → AI draft seluruh struktur cerita (judul, deskripsi, CP, TP, 5 panel kosong dengan prompt narasi) |
| Review Rekaman Siswa | AI feedback: analisis kualitas pelafalan (future, butuh speech-to-text) |
| Penugasan | AI generate instruksi tugas yang sesuai usia berdasarkan judul cerita |

---

### 4.6 Halaman Viewer Cerita (Future — Mode Siswa)

| Fitur | AI Assist |
|---|---|
| Pertanyaan Pemahaman | Panel "Tanya AI tentang cerita ini" — siswa bisa tanya soal isi cerita |
| Kosakata | Tap pada kata sulit → AI jelaskan definisi dalam bahasa sederhana |
| Pronunciation Helper | AI bandingkan rekaman siswa dengan audio guru (future) |

---

## 5. Arsitektur Backend untuk Creator-AI

### 5.1 Route API Baru yang Dibutuhkan

```
POST /api/ai/text          → Generate teks (dialog, narasi, CP, TP, dll.)
POST /api/ai/image         → Generate gambar via imagegen
POST /api/ai/video         → Generate video via videogen
POST /api/ai/analyze-image → Analisis gambar untuk auto-tag (vision)
GET  /api/ai/config        → Ambil konfigurasi AI aktif (provider, model, flags)
```

### 5.2 Contoh Request — Generate Teks Dialog

**`POST /api/ai/text`**

```json
{
  "task": "dialog",
  "context": {
    "story_title": "Kelinci yang Rajin",
    "story_theme": "persahabatan",
    "panel_index": 3,
    "narration": "Budi melihat kelinci kecil yang ketakutan di balik semak",
    "character_name": "Budi",
    "character_gender": "male",
    "previous_dialogs": [
      { "character": "Narator", "text": "Hari itu Budi sedang berjalan di hutan." },
      { "character": "Kelinci", "text": "Tolong! Aku tersesat..." }
    ]
  },
  "user_prompt": "Budi mencoba menenangkan kelinci dengan cara yang ramah",
  "max_tokens": 150
}
```

**Response:**

```json
{
  "result": "Tenang saja, aku Budi. Aku tidak akan menyakitimu. Mari kita cari jalan pulangmu bersama!"
}
```

### 5.3 Contoh Request — Generate Gambar

**`POST /api/ai/image`**

```json
{
  "prompt": "Ilustrasi anak-anak, kelinci putih berbulu lebat berdiri di tepi hutan, suasana sore hari yang hangat, gaya seni buku cerita anak",
  "aspect_ratio": "4:3",
  "model": "nano-banana-pro",
  "reference_images": []
}
```

**Response (dari aKlaude imagegen):**

```json
{
  "data": [
    { "path": "user-id/generated-abc123.png", "url": "https://...signed-url..." }
  ]
}
```

### 5.4 Contoh Request — Generate Video Trailer

**`POST /api/ai/video`**

```json
{
  "prompt": "Trailer cerita anak animasi, kelinci putih berlari di padang rumput hijau, bunga-bunga berwarna cerah, musik gembira, suasana bahagia, gaya kartun anak",
  "model": "veo-3.1-fast",
  "ratio": "16:9",
  "duration": "8s"
}
```

### 5.5 Prompt System untuk Konteks Pendidikan

Setiap request ke AI perlu dibungkus dengan **system prompt** yang mengunci konteks:

```
Kamu adalah asisten kreatif untuk guru yang membuat cerita bergambar pendidikan 
untuk anak-anak sekolah dasar Indonesia. Semua output harus:
- Menggunakan Bahasa Indonesia yang baik, sesuai usia pembaca
- Bersifat positif, mendidik, dan sesuai nilai-nilai kebangsaan
- Tidak mengandung konten kekerasan, SARA, atau tidak pantas
- Singkat dan mudah dipahami anak usia [target_age]
```

---

## 6. Skema Database — Penambahan yang Diperlukan

### 6.1 Tabel `app_settings` (sudah ada — tambah keys baru)

Keys baru yang perlu di-seed:

```sql
INSERT INTO app_settings (key, value) VALUES
  ('creator_ai_enabled',       'false'),
  ('creator_ai_text_gen',      'true'),
  ('creator_ai_image_gen',     'true'),
  ('creator_ai_video_gen',     'false'),
  ('creator_ai_kurikulum_gen', 'true'),
  ('ai_provider',              'aklaude'),
  ('ai_text_model',            'claude-sonnet-4-6'),
  ('ai_image_model',           'nano-banana-pro'),
  ('ai_video_model',           'veo-3.1-fast'),
  ('ai_tts_provider',          'elevenlabs'),
  ('ai_tts_voice_id',          '')           -- default voice ID (diisi setelah setup ElevenLabs)
ON CONFLICT (key) DO NOTHING;
```

### 6.2 Penambahan Kolom pada Tabel `users`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS creator_ai_access     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_subscription_tier  TEXT,         -- NULL | 'basic' | 'pro' | 'max'
  ADD COLUMN IF NOT EXISTS ai_subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_subscription_end   TIMESTAMPTZ;

COMMENT ON COLUMN users.creator_ai_access     IS 'Diaktifkan manual oleh admin, atau otomatis saat subscription aktif';
COMMENT ON COLUMN users.ai_subscription_tier  IS 'Tier langganan: basic (teks), pro (teks+gambar), max (teks+gambar+video)';
```

**Logika akses** di server (`/api/ai/config`):

```ts
// User bisa akses Creator-AI jika:
// 1. Role-nya adalah 'creator' atau 'admin', ATAU
// 2. creator_ai_access = true (manual by admin), ATAU
// 3. ai_subscription_end > now() (subscription aktif)
const userHasAiAccess =
  ["creator", "admin"].includes(user.role) ||
  user.creator_ai_access === true ||
  (user.ai_subscription_end !== null && new Date(user.ai_subscription_end) > new Date());
```

### 6.3 Tabel `ai_generation_log` (opsional — untuk monitoring penggunaan)

```sql
CREATE TABLE ai_generation_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  task_type    TEXT NOT NULL,  -- 'text', 'image', 'video', 'analyze'
  model        TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_estimate NUMERIC(10, 6),
  story_id     UUID REFERENCES stories(id),
  panel_id     UUID REFERENCES panels(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Komponen UI Baru yang Perlu Dibuat

| Komponen | Path | Keterangan |
|---|---|---|
| `AiPromptButton` | `src/components/ai/ai-prompt-button.tsx` | Tombol `✨` kecil yang bisa ditempel di mana saja + mini panel prompt |
| `AiTextGenerator` | `src/components/ai/ai-text-generator.tsx` | Panel slide-in untuk generate teks dengan preview & accept |
| `AiImageGenerator` | `src/components/ai/ai-image-generator.tsx` | Modal generate gambar + preview carousel + simpan ke galeri |
| `AiVideoGenerator` | `src/components/ai/ai-video-generator.tsx` | Modal generate video trailer + preview player |
| `AiKurikulumAssistant` | `src/components/ai/ai-kurikulum-assistant.tsx` | Modal khusus untuk generate semua field Kurikulum Merdeka |
| `AiProviderSettings` | `src/components/ai/ai-provider-settings.tsx` | Section di `/admin/settings` untuk konfigurasi provider |
| `useCreatorAi` | `src/hooks/use-creator-ai.ts` | Hook untuk cek apakah Creator-AI aktif & baca config |
| `AiTtsButton` | `src/components/ai/ai-tts-button.tsx` | Tombol "🔊 Generate Suara" — generate audio dari teks narasi/dialog |
| `CreatorAiUpgradePage` | `src/app/creator-ai/page.tsx` | Halaman landing upgrade Creator-AI (statis + CTA) |
| `UpgradeGate` | `src/components/ai/upgrade-gate.tsx` | Wrapper yang menampilkan "Upgrade" banner jika user belum punya akses AI |

---

## 8. Hook `useCreatorAi` — Konsep

```ts
// src/hooks/use-creator-ai.ts
export function useCreatorAi() {
  const [config, setConfig] = useState<AiConfig | null>(null);

  useEffect(() => {
    fetch("/api/ai/config").then(r => r.json()).then(setConfig);
  }, []);

  return {
    enabled:        config?.creator_ai_enabled ?? false,
    textEnabled:    config?.creator_ai_text_gen ?? false,
    imageEnabled:   config?.creator_ai_image_gen ?? false,
    videoEnabled:   config?.creator_ai_video_gen ?? false,
    kurikulumAi:    config?.creator_ai_kurikulum_gen ?? false,
    provider:       config?.ai_provider ?? "aklaude",
    textModel:      config?.ai_text_model ?? "claude-sonnet-4-6",
    imageModel:     config?.ai_image_model ?? "nano-banana-pro",
    videoModel:     config?.ai_video_model ?? "veo-3.1-fast",
    /** true jika fitur global aktif DAN user ini memiliki hak akses (role/subscription) */
    canAccess:      (config?.creator_ai_enabled ?? false) && (config?.user_has_ai_access ?? false),
  };
}
```

Setiap komponen yang memiliki fitur AI cukup:

```tsx
const ai = useCreatorAi();

{ai.enabled && ai.imageEnabled && (
  <AiImageGeneratorButton prompt={contextPrompt} onPick={handlePick} />
)}
```

---

## 9. Roadmap Implementasi (Bertahap)

### Fase 0 — Role & Akses (Prasyarat)

- [ ] Tambah nilai `"creator"` ke `UserRole` di `src/lib/types.ts`
- [ ] Migrasi database: tambah kolom `creator_ai_access BOOLEAN DEFAULT false` dan `ai_subscription_tier TEXT` ke tabel `users`
- [ ] Update API `/api/ai/config` agar menyertakan flag `user_has_ai_access` berdasarkan role/subscription user yang sedang login
- [ ] Tambah toggle **Aktifkan Creator-AI** di halaman admin user detail (`/admin/stories` atau user management)
- [ ] Buat halaman `/creator-ai` — landing page upgrade (statis + CTA)
- [ ] Buat komponen `UpgradeGate` — ditampilkan jika `canAccess === false`

### Fase 1 — Fondasi (Prioritas Tinggi)

- [ ] Tambah entri baru di `SETTINGS_CONFIG` pada `/admin/settings`:
  - Toggle `creator_ai_enabled`
  - Toggle sub-fitur (text, image, video, kurikulum)
- [ ] Buat section **Konfigurasi Provider AI** di halaman settings:
  - Dropdown pilih provider
  - Input API Key (masked)
  - Dropdown pilih model teks, gambar, video
- [ ] Buat route `GET /api/ai/config` — expose config ke client (tanpa API key, sertakan `user_has_ai_access`)
- [ ] Buat route `POST /api/ai/text` — proxy ke aKlaude `/v1/chat/completions`
- [ ] Buat komponen `AiPromptButton` + `AiTextGenerator`
- [ ] Buat hook `useCreatorAi`

### Fase 2 — Text Generation

- [ ] Integrasi di `/stories/create`: Generate judul, deskripsi
- [ ] Integrasi di `/stories/[id]/edit`: Generate dialog, narasi
- [ ] Integrasi di `KurikulumMerdekaSection`: Generate CP, TP, pertanyaan pemantik
- [ ] Integrasi di `CharacterManager`: Generate deskripsi karakter

### Fase 3 — Image Generation

- [ ] Buat route `POST /api/ai/image` — proxy ke aKlaude `/api/imagegen/generate`
- [ ] Buat komponen `AiImageGenerator` (modal + preview + simpan ke library)
- [ ] Integrasi di `CoverImageUploader`: Tombol "Generate dengan AI"
- [ ] Integrasi di `AssetPickerModal`: Tab "Generate AI"
- [ ] Integrasi di editor panel: Tombol generate gambar panel
- [ ] Integrasi di `CharacterManager`: Generate avatar karakter
- [ ] Auto-tag saat upload aset (via AI vision)

### Fase 4 — Video Generation

- [ ] Buat route `POST /api/ai/video` — proxy ke aKlaude `/api/videogen/generate`
- [ ] Buat komponen `AiVideoGenerator`
- [ ] Integrasi di `VideoTrailerUploader`: Tab "Generate dengan AI"

### Fase 5 — Audio / TTS

- [ ] Pilih & konfigurasi provider TTS (lihat **Section 10.2**) — rekomendasi ElevenLabs
- [ ] Tambah keys `ai_tts_provider` + `ai_tts_voice_id` ke `app_settings`
- [ ] Tambah kolom `voice_id` opsional ke field `StoryCharacter` di `src/lib/types.ts`
- [ ] Buat route `POST /api/ai/tts` — proxy ke provider TTS aktif
- [ ] Buat komponen `AiTtsButton` — tombol "🔊 Generate Suara" di samping tombol Rekam pada narasi & dialog
- [ ] Integrasi di `AudioRecorder`: tab ketiga "Generate TTS" selain Rekam dan Upload
- [ ] UI assign voice per karakter di `CharacterManager` (dropdown pilih suara dari provider)

### Fase 6 — Advanced (Future)

- [ ] AI Pronunciation Feedback untuk rekaman siswa
- [ ] AI Story Wizard: isi 1 topik → draft cerita lengkap (judul, CP, TP, 5 panel, karakter)
- [ ] AI Tanya Jawab di halaman viewer cerita (untuk siswa)
- [ ] Log penggunaan AI (`ai_generation_log`) + estimasi biaya di dashboard admin

---

## 10. Referensi API

### 10.1 aKlaude (Provider Default untuk Teks, Gambar, Video)

> Dokumentasi lengkap: `docs/aKlaude-model-doc.md`

### Text Generation

```
POST https://api.aklaude.xyz/api/proxy/v1/chat/completions
Authorization: Bearer <AI_API_KEY>
Content-Type: application/json

{
  "model": "claude-sonnet-4-6",
  "messages": [
    { "role": "system", "content": "<system_prompt>" },
    { "role": "user", "content": "<user_prompt>" }
  ],
  "max_tokens": 512,
  "temperature": 0.7
}
```

### Image Generation

```
POST https://api.aklaude.xyz/api/imagegen/generate
Authorization: Bearer <AI_API_KEY>
Content-Type: application/json

{
  "model": "nano-banana-pro",
  "prompt": "<deskripsi gambar>",
  "aspect_ratio": "4:3"
}
```

### Video Generation

```
POST https://api.aklaude.xyz/api/videogen/generate
Authorization: Bearer <AI_API_KEY>
Content-Type: application/json

{
  "model": "veo-3.1-fast",
  "prompt": "<deskripsi video>",
  "ratio": "16:9",
  "duration": "8s"
}
```

### 10.1.4 Model yang Direkomendasikan untuk Padu-EDU

| Kebutuhan | Model | Alasan |
|---|---|---|
| Generate dialog/narasi pendek | `claude-haiku-4-5` | Paling cepat & hemat (€1/1M input) |
| Generate CP, TP, refleksi | `claude-sonnet-4-6` | Seimbang kualitas & harga |
| Draft cerita lengkap (wizard) | `claude-sonnet-4-6` atau `claude-opus-4-7` | Konteks panjang, kualitas tinggi |
| Analisis gambar (auto-tag) | `claude-sonnet-4-6` | Vision support penuh |
| Generate gambar | `nano-banana-pro` | Default imagegen |
| Generate video trailer | `veo-3.1-fast` | Hemat (€0.40/clip), ada audio |

---

### 10.2 Provider TTS/Audio Generation (Terpisah dari aKlaude)

aKlaude tidak menyediakan endpoint TTS. Gunakan salah satu provider berikut sebagai **provider TTS terpisah**:

#### Opsi A — ElevenLabs ⭐ (Rekomendasi)

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
xi-api-key: <ELEVENLABS_API_KEY>
Content-Type: application/json

{
  "text": "Teks narasi atau dialog yang akan disuarakan",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

**Response:** binary audio (`audio/mpeg`) — simpan ke storage via `/api/upload` lalu gunakan URL-nya.

| Keunggulan | Keterangan |
|---|---|
| Kualitas suara | Terbaik di kelasnya, sangat natural |
| Bahasa Indonesia | Didukung via `eleven_multilingual_v2` |
| Voice cloning | Bisa rekam suara asli guru/karakter → jadikan voice_id unik |
| Voice per karakter | Simpan `voice_id` di `StoryCharacter.voice_id` untuk konsistensi antar panel |
| Harga | Free 10k karakter/bln; Starter $5/bln (30k karakter); Creator $22/bln (100k) |

**Daftar suara bawaan yang relevan:**
- `pNInz6obpgDQGcFmaJgB` — Adam (pria, natural)
- `EXAVITQu4vr4xnSDxMaL` — Bella (wanita, lembut — cocok untuk narrator anak)
- `yoZ06aMxZJJ28mfd3POQ` — Sam (pria muda)
- Atau browse di https://elevenlabs.io/voice-library untuk suara berbahasa Indonesia

> ⚠️ **Catatan suara anak:** ElevenLabs (dan hampir semua TTS provider) tidak menyediakan suara anak-anak usia SD berbahasa Indonesia secara bawaan. Ini adalah keterbatasan umum di industri. Workaround yang tersedia:
> 1. **Voice Design** — Buat suara sintetis baru via ElevenLabs Voice Lab dengan deskripsi `"young Indonesian child, approximately 8 years old, cheerful"` → simpan sebagai custom `voice_id`
> 2. **Voice Cloning** — Rekam suara siswa/talent asli (1-3 menit, dengan izin orang tua) → clone via ElevenLabs Instant Voice Cloning
> 3. **Workaround umum** — Mayoritas buku cerita anak dan audiobook memang menggunakan narator/dubber **dewasa** yang membacakan untuk anak, bukan suara anak itu sendiri. Ini konvensi yang sudah diterima luas.

#### Opsi B — Google Cloud Text-to-Speech

```
POST https://texttospeech.googleapis.com/v1/text:synthesize
Authorization: Bearer <GOOGLE_ACCESS_TOKEN>
Content-Type: application/json

{
  "input": { "text": "Teks narasi atau dialog" },
  "voice": {
    "languageCode": "id-ID",
    "name": "id-ID-Neural2-A",
    "ssmlGender": "FEMALE"
  },
  "audioConfig": { "audioEncoding": "MP3" }
}
```

**Response:** `{ "audioContent": "<base64 MP3>" }` — decode dan upload ke storage.

| Keterangan | Detail |
|---|---|
| Bahasa Indonesia | Dukungan terbaik — ada Neural2 & WaveNet khusus `id-ID` |
| Harga | 1 juta karakter gratis/bln; Neural2 $0.000016/karakter |
| Cocok untuk | Jika sudah pakai Google Cloud / Firebase |

Suara Indonesia yang tersedia: `id-ID-Neural2-A` (perempuan), `id-ID-Neural2-B` (laki-laki), `id-ID-Wavenet-A/B/C/D`.

#### Opsi C — OpenAI TTS

```
POST https://api.openai.com/v1/audio/speech
Authorization: Bearer <OPENAI_API_KEY>
Content-Type: application/json

{
  "model": "tts-1",
  "input": "Teks narasi atau dialog",
  "voice": "nova",
  "response_format": "mp3"
}
```

**Response:** binary audio stream MP3.

| Keterangan | Detail |
|---|---|
| Harga | `tts-1`: $15/1M karakter; `tts-1-hd`: $30/1M karakter |
| Voices | alloy, echo, fable, onyx, nova, shimmer (tidak bisa pilih bahasa spesifik) |
| Cocok untuk | Jika sudah ada OpenAI API key dan tidak butuh voice Indonesia yang spesifik |

#### Perbandingan Cepat

| | ElevenLabs | Google Cloud TTS | OpenAI TTS |
|---|---|---|---|
| Kualitas | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Dukungan `id-ID` | ✅ (multilingual) | ✅ (native) | ⚠️ (umum) |
| Voice per karakter | ✅ (voice_id) | ⚠️ (terbatas) | ⚠️ (6 pilihan) |
| Free tier | ✅ 10k kar/bln | ✅ 1M kar/bln | ❌ |
| Voice cloning | ✅ | ❌ | ❌ |
| Kompleksitas setup | Rendah | Sedang (GCP) | Rendah |

**Rekomendasi:** Mulai dengan **ElevenLabs** (free tier cukup untuk fase pengembangan + kualitas & voice cloning terbaik untuk karakter cerita). Tambah Google Cloud TTS sebagai fallback jika sudah ada infrastruktur GCP.

#### Penambahan di `StoryCharacter` (types.ts)

```ts
export interface StoryCharacter {
  id: string;
  name: string;
  avatar_url?: string;
  gender: CharacterGender;
  color: string;
  description?: string;
  performed_by?: string;
  performed_by_name?: string;
  voice_id?: string;       // TTS voice ID untuk karakter ini (ElevenLabs/provider)
  voice_provider?: string; // 'elevenlabs' | 'google' | 'openai' — override provider default
}
```

#### Route `/api/ai/tts` — Logika

```ts
// POST /api/ai/tts
// Body: { text: string, voice_id?: string, provider?: string }
// 1. Tentukan provider: body.provider ?? settings.ai_tts_provider ?? 'elevenlabs'
// 2. Tentukan voice: body.voice_id ?? settings.ai_tts_voice_id ?? <default per provider>
// 3. Panggil API provider → dapat binary audio
// 4. Upload ke storage via internal upload → return { url: string }
```

---

## 11. Pertimbangan UX

1. **Indikator mode aktif** — Ketika Creator-AI aktif, tampilkan badge kecil `✨ AI` di navbar atau di judul halaman authoring agar guru tahu fitur ini tersedia.

2. **Loading state** — Generate teks ~1-3 detik, gambar ~5-15 detik, video ~30-90 detik. Tampilkan progress indicator yang informatif.

3. **Non-destruktif** — Output AI selalu ditampilkan sebagai *saran* di panel preview, bukan langsung menimpa konten yang sudah ada. Guru selalu punya tombol "Gunakan" atau "Abaikan".

4. **Konteks otomatis** — Setiap request ke AI menyertakan konteks relevan (judul cerita, tema, level, karakter yang sudah dibuat) agar output lebih relevan tanpa guru harus mengisi ulang.

5. **Rate limiting di UI** — Tambahkan debounce + disable tombol selama proses generate untuk mencegah double-request.

6. **Fallback graceful** — Jika API key tidak diset atau quota habis, tampilkan pesan yang ramah: "Fitur AI tidak tersedia saat ini. Hubungi admin untuk mengaktifkan." (bukan error teknis).

7. **Bahasa Indonesia** — Semua label, placeholder, dan pesan AI harus dalam Bahasa Indonesia.

---

## 12. Akses & Role Pengguna Creator-AI

### 12.1 Perubahan `UserRole`

Role saat ini di `src/lib/types.ts`:

```ts
export type UserRole = "guru" | "siswa" | "member" | "admin";
```

Role baru yang perlu ditambahkan:

```ts
export type UserRole = "guru" | "siswa" | "member" | "admin" | "creator";
```

Role `creator` adalah role khusus untuk anggota tim konten / kreator yang memang bertugas membuat cerita secara profesional. Mereka mendapat akses penuh Creator-AI tanpa perlu upgrade manual.

### 12.2 Matriks Akses Creator-AI

| Role | Akses Creator-AI | Keterangan |
|---|---|---|
| `admin` | ✅ Selalu aktif | Admin mengontrol semua pengaturan |
| `creator` | ✅ Selalu aktif (jika fitur global ON) | Role baru khusus tim kreator |
| `guru` | ✅ Jika diaktifkan manual ATAU subscription aktif | Default: tidak aktif |
| `member` | ❌ | Role konsumen, tidak membuat konten |
| `siswa` | ❌ | Role konsumen, tidak membuat konten |

### 12.3 Dua Jalur Aktivasi untuk Guru

#### Jalur A — Aktivasi Manual oleh Admin

Admin buka halaman detail pengguna di panel admin → toggle **"Aktifkan Creator-AI"** → kolom `creator_ai_access = true` tersimpan di tabel `users`.

```
/admin/users/[id]
───────────────────────────────
Nama: Budi Santoso
Role: guru

[✓] Aktifkan fitur Creator-AI        ← toggle baru
Catatan: Diaktifkan oleh admin pada 13 Jun 2026
```

#### Jalur B — Self-Service Upgrade (Subscription)

Guru membuka halaman `/creator-ai` → pilih paket → proses pembayaran → `ai_subscription_tier` dan `ai_subscription_end` diisi otomatis.

Selama `ai_subscription_end > now()`, guru tersebut mendapat akses sesuai tier-nya.

### 12.4 Pembatasan per Tier Subscription

| Tier | Teks | Gambar | Video | Kurikulum AI |
|---|---|---|---|---|
| `basic` | ✅ | ❌ | ❌ | ✅ |
| `pro` | ✅ | ✅ | ❌ | ✅ |
| `max` | ✅ | ✅ | ✅ | ✅ |
| Manual (admin) | ✅ | ✅ | ✅ | ✅ |
| Role `creator` | ✅ | ✅ | ✅ | ✅ |

> Pembatasan tier diimplementasi di route `/api/ai/config` — response akan menyertakan flag per-fitur berdasarkan tier user, bukan hanya flag global dari `app_settings`.

### 12.5 Perubahan di `useCreatorAi` Hook

Hook perlu diperluas agar menyertakan info tier:

```ts
return {
  canAccess:       config?.user_has_ai_access ?? false,
  tier:            config?.user_ai_tier ?? null,  // null | 'basic' | 'pro' | 'max' | 'full'
  textEnabled:     config?.creator_ai_text_gen && canAccessText,
  imageEnabled:    config?.creator_ai_image_gen && canAccessImage,
  videoEnabled:    config?.creator_ai_video_gen && canAccessVideo,
  // ...
};
```

Komponen-komponen AI cukup memeriksa:

```tsx
const ai = useCreatorAi();

{!ai.canAccess && <UpgradeGate feature="Creator-AI" />}
{ai.canAccess && ai.imageEnabled && <AiImageGeneratorButton ... />}
```

### 12.6 Komponen `UpgradeGate`

Component ringan yang muncul menggantikan fitur AI ketika `canAccess === false`:

```
╔══════════════════════════════════════════════╗
║  ✨ Fitur ini memerlukan Creator-AI           ║
║                                              ║
║  Generate gambar, teks, dan video            ║
║  langsung dari editor cerita.                ║
║                                              ║
║  [Pelajari & Upgrade →]                      ║
╚══════════════════════════════════════════════╝
```

Klik tombol → navigasi ke `/creator-ai` (halaman upgrade).

---

## 13. Halaman Upgrade & Pricing — `/creator-ai`

### 13.1 Tujuan Halaman

Halaman statis (atau hybrid static+dynamic) yang menjelaskan fitur Creator-AI dan mendorong guru untuk upgrade. Dapat diakses oleh semua pengguna yang sudah login.

Route: `/creator-ai`  
File: `src/app/creator-ai/page.tsx`

### 13.2 Struktur Konten Halaman

```
┌─────────────────────────────────────────────────────┐
│  HERO                                               │
│  ✨ Creator-AI untuk Guru                           │
│  Buat cerita, gambar, dan video                     │
│  lebih cepat dengan bantuan AI                      │
│                          [Mulai Upgrade →]          │
├─────────────────────────────────────────────────────┤
│  FITUR UNGGULAN (grid 3 kolom)                      │
│  📝 Generate Teks    🖼 Generate Gambar  🎬 Video   │
│  Dialog, narasi,     Cover, karakter,    Trailer    │
│  Kurikulum Merdeka   latar panel         otomatis   │
├─────────────────────────────────────────────────────┤
│  CARA KERJA (3 langkah)                             │
│  1. Tuliskan petunjuk/prompt                        │
│  2. AI generate konten                              │
│  3. Terima atau edit hasilnya                       │
├─────────────────────────────────────────────────────┤
│  PRICING                                            │
│  [Paket Basic] [Paket Pro] [Paket Max]              │
├─────────────────────────────────────────────────────┤
│  FAQ                                                │
│  CTA akhir: [Upgrade Sekarang →]                    │
└─────────────────────────────────────────────────────┘
```

### 13.3 Pricing Tiers (Usulan)

> ⚠️ Harga berikut adalah **usulan awal** dan harus disesuaikan dengan biaya operasional AI (terutama biaya per-token dan per-gambar dari provider) serta target pasar (guru Indonesia).

| | **Gratis** | **Basic** | **Pro** | **Max** |
|---|---|---|---|---|
| **Harga/bulan** | Rp 0 | Rp 29.000 | Rp 79.000 | Rp 149.000 |
| **Harga/tahun** | — | Rp 290.000 | Rp 790.000 | Rp 1.490.000 |
| Buat & edit cerita | ✅ | ✅ | ✅ | ✅ |
| Generate teks (dialog, narasi, CP/TP) | ❌ | ✅ | ✅ | ✅ |
| Bantu Kurikulum Merdeka | ❌ | ✅ | ✅ | ✅ |
| Generate gambar (cover, karakter, latar) | ❌ | ❌ | ✅ | ✅ |
| Auto-tag aset dengan AI | ❌ | ❌ | ✅ | ✅ |
| Generate video trailer | ❌ | ❌ | ❌ | ✅ |
| Kuota generate/bulan | — | 100 teks | 100 teks + 50 gambar | Tak terbatas* |
| Prioritas support | — | — | ✅ | ✅ |

*Tunduk pada fair use policy.

**Keterangan paket:**
- **Gratis** — Semua fitur platform dasar (buat cerita, panel viewer, rekaman siswa). Tanpa AI.
- **Basic** — Cocok untuk guru yang ingin bantuan teks dan Kurikulum Merdeka saja.
- **Pro** — Cocok untuk guru yang aktif membuat konten visual. Generate gambar untuk cover, karakter, dan latar panel.
- **Max** — Cocok untuk tim konten profesional. Semua fitur AI termasuk video trailer.

### 13.4 Skema Harga Tahunan (Hemat ~17%)

```
Basic:  Rp 29.000 × 12 = Rp 348.000  →  Rp 290.000/tahun  (hemat Rp 58.000)
Pro:    Rp 79.000 × 12 = Rp 948.000  →  Rp 790.000/tahun  (hemat Rp 158.000)
Max:    Rp 149.000 × 12 = Rp 1.788.000 → Rp 1.490.000/tahun (hemat Rp 298.000)
```

### 13.5 FAQ yang Perlu Dijawab di Halaman

1. **Apakah AI menghasilkan konten yang sesuai untuk anak-anak?**  
   → Iya, semua permintaan AI diproses dengan system prompt keamanan yang mengunci output agar sesuai untuk anak SD.

2. **Apakah konten yang di-generate adalah milik saya?**  
   → Ya, semua konten yang di-generate dan disimpan ke cerita/aset adalah milik akun Anda.

3. **Bagaimana jika kuota habis sebelum akhir bulan?**  
   → Fitur AI akan menampilkan pesan kuota habis. Anda bisa upgrade ke tier lebih tinggi atau menunggu reset di awal bulan.

4. **Bisakah admin sekolah mengaktifkan tanpa guru harus bayar?**  
   → Ya. Admin dapat mengaktifkan akses penuh Creator-AI untuk guru secara manual dari panel admin, tanpa perlu subscription.

5. **Apakah ada uji coba gratis?**  
   → Bisa ditawarkan trial 7 hari untuk paket Pro (keputusan bisnis).

### 13.6 Komponen & Route yang Dibutuhkan

| Item | Path | Keterangan |
|---|---|---|
| Halaman upgrade | `src/app/creator-ai/page.tsx` | Landing page + pricing |
| Halaman sukses | `src/app/creator-ai/success/page.tsx` | Konfirmasi setelah upgrade |
| API checkout | `src/app/api/ai/subscribe/route.ts` | Inisiasi pembayaran (Midtrans/Stripe) |
| API webhook | `src/app/api/ai/webhook/route.ts` | Konfirmasi pembayaran → update subscription |
| Manajemen langganan | `src/app/profile/subscription/page.tsx` | Status langganan + perpanjang/batalkan |

### 13.7 Integrasi Pembayaran (Rekomendasi)

Untuk pasar Indonesia, **Midtrans** adalah pilihan utama (mendukung transfer bank, QRIS, GoPay, OVO, Indomaret, dll.).

```
[Guru klik Upgrade] → POST /api/ai/subscribe { tier, interval: 'month'|'year' }
                   → Server buat Midtrans Snap token
                   → Frontend redirect ke Midtrans Snap popup
                   → Midtrans callback → POST /api/ai/webhook
                   → Server validasi signature → update users.ai_subscription_tier + ai_subscription_end
                   → Redirect ke /creator-ai/success
```

> Untuk fase awal (sebelum payment gateway siap), gunakan **mode manual**: guru menghubungi admin via WhatsApp/email → admin aktifkan via toggle di panel admin. Ini cukup untuk validasi pasar sebelum investasi ke integrasi payment.

---

*Dokumen ini dibuat berdasarkan penelusuran kode sumber aplikasi padu-edu pada Juni 2026. Diperbarui sesuai perkembangan implementasi.*
