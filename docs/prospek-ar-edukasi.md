# Prospek Pengembangan Panel AR (Augmented Reality) untuk Edukasi

> Dokumen telaah kelayakan dan strategi pengembangan fitur **Panel AR** sebagai perluasan dari **Panel Cerita** di platform Panel Gambar Bersuara.

---

## 1. Ringkasan Eksekutif

**Pertanyaan utama:** Apakah pengembangan Panel AR layak dilakukan menggunakan stack, infrastruktur, dan arsitektur Panel Gambar saat ini?

**Jawaban singkat:** **Ya, sangat layak.** Stack Next.js + React + Supabase + PWA yang saat ini digunakan sudah **cukup matang** untuk menampung fitur AR berbasis **WebAR** tanpa perlu refactor arsitektur besar. Rendering AR berjalan sepenuhnya di sisi klien (browser pengguna), sehingga **beban server tetap rendah** dan infrastruktur IDCloudHost saat ini dapat diteruskan.

Pengembangan tidak memerlukan aplikasi native (Android/iOS), cukup penambahan library 3D/AR dan modul baru di codebase yang sama — **satu codebase, satu deployment, dua produk (Panel Cerita + Panel AR)**.

**Estimasi realistis:** MVP Panel AR dapat diselesaikan dalam **3–4 bulan** oleh 1–2 developer yang sudah familiar dengan codebase existing, dengan biaya infrastruktur tambahan mendekati **Rp 0** di fase awal (menggunakan library open-source dan Supabase free tier).

---

## 2. Pemetaan Aset Existing yang Bisa Dimanfaatkan

Beberapa komponen Panel Gambar saat ini **secara langsung dapat dipakai ulang** untuk Panel AR:

| Aset Existing | Dipakai Ulang untuk AR |
|---|---|
| Autentikasi Supabase (guru/siswa/admin) | Sama persis — tidak perlu ubah |
| Database PostgreSQL + RLS | Tinggal tambah tabel `ar_scenes`, `ar_markers`, `ar_assets` |
| Supabase Storage | Menyimpan file 3D (`.glb`/`.usdz`) + gambar marker |
| PWA + offline cache | Siswa bisa download konten AR saat online, pakai offline |
| Audio engine (Howler.js) | Narasi & dialog AR reuse sistem audio existing |
| Sistem `Dialog`, `Narration`, `Timeline` | Bisa di-attach ke objek 3D di scene AR |
| Canvas Editor (`react-konva`) | **Pola UX yang sama** (drag/drop, transformer, layer) dipindahkan ke scene 3D |
| Story Viewer + Progress Bar | Polanya diduplikasi untuk AR Viewer |
| Deployment PM2 + Nginx IDCloudHost | Tidak perlu diubah — AR dirender di klien |

Kesimpulan: sekitar **60–70% infrastruktur aplikasi sudah ada**, pengembangan AR bersifat **penambahan modul**, bukan rewrite.

---

## 3. Pilihan Teknologi AR untuk Web

### 3.1 Perbandingan Library WebAR

| Library | Lisensi | Kemampuan | Ukuran | Cocok untuk |
|---|---|---|---|---|
| **MindAR.js** | MIT (gratis) | Image tracking, face tracking | ~500 KB | **Rekomendasi utama** — image marker AR, dikembangkan aktif |
| **AR.js** | MIT (gratis) | Marker (Hiro/NFT), location-based | ~300 KB | Marker sederhana, kurang akurat |
| **model-viewer** (Google) | Apache 2.0 | View 3D + AR Quick Look (iOS) + Scene Viewer (Android) | ~80 KB | Display 3D standalone tanpa marker |
| **WebXR Device API** | Standar W3C | Plane detection, hit-test (native) | Built-in | AR markerless (Android Chrome penuh, iOS terbatas) |
| **8th Wall** | Komersial (~$3000/bulan) | SLAM, face, world tracking kualitas tinggi | — | Enterprise (tidak direkomendasikan tahap awal) |
| **Zappar** | Freemium | Image/face/world tracking | — | Alternatif komersial menengah |

**Rekomendasi stack AR:**
- **Three.js** + **@react-three/fiber** + **@react-three/drei** → rendering 3D
- **MindAR.js** → image tracking (marker AR berbasis gambar di buku siswa)
- **model-viewer** → fallback AR Quick Look untuk iOS
- **WebXR** (opsional, fase lanjut) → AR tanpa marker untuk placement objek di ruang nyata

### 3.2 Format Aset 3D

| Format | Kegunaan | Kompatibilitas |
|---|---|---|
| **glTF 2.0 / GLB** | Format standar 3D web | Three.js, model-viewer, semua browser modern |
| **USDZ** | AR Quick Look iOS | Safari iOS 12+ (wajib untuk AR iOS) |
| **Draco compression** | Kompresi mesh (hingga 90%) | Didukung Three.js |
| **KTX2 / Basis** | Kompresi tekstur GPU-friendly | Didukung Three.js + transcoder |

Pipeline ideal: ilustrator export GLB → kompres dengan Draco + KTX2 → ukuran akhir 0.5–3 MB per objek (layak untuk koneksi sekolah).

---

## 4. Kelayakan Teknis terhadap Stack Saat Ini

### 4.1 Kompatibilitas dengan Next.js 16 + React 19

| Aspek | Status | Catatan |
|---|---|---|
| `three`, `@react-three/fiber` | ✅ Kompatibel | Sudah support React 19 |
| `mind-ar` | ✅ Kompatibel | Library vanilla JS, di-mount di komponen client |
| SSR / SSG | ⚠️ Perlu `dynamic()` | Komponen AR wajib `ssr: false` (akses kamera & WebGL) |
| Turbopack (Next 16) | ✅ Aman | Tidak ada konflik yang diketahui |
| PWA / Service Worker | ✅ Aman | AR justru mendapat manfaat offline-caching aset 3D |
| Konva (canvas 2D existing) | ✅ Koeksistensi | Dua library beda domain (2D DOM-canvas vs 3D WebGL) |

### 4.2 Dependensi Tambahan yang Dibutuhkan

```json
{
  "three": "^0.170.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^10.0.0",
  "mind-ar": "^1.2.5",
  "@google/model-viewer": "^4.0.0"
}
```

Perkiraan penambahan bundle: **~400–600 KB gzipped** (di-load lazy hanya di halaman AR, tidak mempengaruhi halaman Panel Cerita).

### 4.3 Kompatibilitas Perangkat Pengguna

| Perangkat | Dukungan AR Web | Catatan |
|---|---|---|
| **Android 8+** (Chrome) | ✅ Penuh (WebXR + MindAR) | ARCore-compatible device → ~95% HP Android 2019+ |
| **iPhone 6s+ / iOS 12+** (Safari) | ✅ MindAR image tracking, ✅ AR Quick Look via USDZ | WebXR tidak didukung, tapi image tracking jalan |
| **Tablet Android** | ✅ Penuh | Ideal untuk AR |
| **iPad** | ✅ MindAR + AR Quick Look | Sangat baik |
| **Smartboard/IFP** | ⚠️ Parsial | Tidak punya kamera belakang → AR tidak berfungsi; fallback: tampilan 3D non-AR |
| **Laptop/PC webcam** | ⚠️ Face tracking OK, image tracking terbatas | AR di PC bukan use-case utama |

**Syarat klien untuk AR:**
- Browser modern (Chrome/Safari/Edge, Firefox parsial)
- Kamera belakang (mobile/tablet)
- **HTTPS wajib** (sudah tersedia di `panel-edu.digsan.id`)
- RAM ≥ 2 GB (mayoritas HP sekolah sudah memenuhi)
- Koneksi internet awal untuk download aset; setelah itu bisa offline via PWA

### 4.4 Beban Server & Infrastruktur

AR modern bersifat **client-side heavy**, server-side ringan:

| Komponen | Dampak ke Server IDCloudHost Saat Ini |
|---|---|
| Rendering 3D | **0% — di GPU perangkat user** |
| Image tracking | **0% — di CPU perangkat user** |
| Upload aset 3D (guru) | Sama seperti upload gambar/audio existing |
| Storage 3D (GLB) | Supabase Storage, kuota free tier 1 GB → cukup untuk ratusan model |
| Bandwidth | Aset 3D terkirim sekali, cached di PWA |
| CPU/RAM server | **Tidak bertambah signifikan** |

Konklusi: **Server IDCloudHost 2 vCPU / 2 GB RAM saat ini sudah cukup** untuk menampung ribuan pengguna AR secara bersamaan, karena yang "berat" ada di perangkat klien.

---

## 5. Rancangan Fitur Panel AR

### 5.1 Tipe Panel AR yang Diusulkan

| Tipe | Deskripsi | Use Case Edukasi SD |
|---|---|---|
| **AR Marker (Image-tracking)** | Siswa mengarahkan kamera ke gambar di buku → muncul objek 3D + audio narasi | Buku cerita hidup, kartu flashcard, peta Indonesia muncul Candi Borobudur 3D |
| **AR Markerless (Surface placement)** | Siswa menekan layar untuk menaruh objek 3D di meja/lantai | Tata surya di meja, anatomi tubuh di kelas |
| **AR 360° / Scene** | Siswa melihat sekeliling → konten muncul di sekitar | Tur virtual (museum, pasar tradisional) |
| **AR Kombinasi Panel Cerita** | Panel cerita 2D berisi trigger AR: "tap untuk lihat 3D" | Panel cerita hidup — gambar rumah adat di panel bisa jadi 3D rumah adat yang bisa diputar |

### 5.2 Skema Data Baru (Supabase)

```sql
-- Scene AR (analog dengan Story)
create table ar_scenes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  scene_type text check (scene_type in ('marker','markerless','scene360')),
  owner_id uuid references auth.users(id),
  class_id uuid references classes(id),
  published boolean default false,
  created_at timestamptz default now()
);

-- Marker (satu scene bisa banyak marker)
create table ar_markers (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references ar_scenes(id) on delete cascade,
  name text,
  image_url text,              -- gambar target yang di-print di buku
  mind_file_url text,          -- file .mind hasil kompilasi MindAR
  order_index int default 0
);

-- Aset 3D yang muncul saat marker terdeteksi
create table ar_assets (
  id uuid primary key default gen_random_uuid(),
  marker_id uuid references ar_markers(id) on delete cascade,
  asset_type text check (asset_type in ('model3d','text','audio','image2d')),
  src_url text,                -- GLB/USDZ/audio URL
  transform jsonb,             -- {x,y,z,rotX,rotY,rotZ,scale}
  animation_name text,         -- nama animasi GLB yang diputar
  audio_trigger text check (audio_trigger in ('auto','tap','hover')),
  dialog_id uuid references dialogs(id), -- reuse sistem dialog existing
  created_at timestamptz default now()
);
```

Pola ini **paralel dengan skema `stories/panels/dialogs` existing** — kurva belajar tim minimal.

### 5.3 Arsitektur Komponen (React)

```
app/src/
├─ app/
│  ├─ ar/
│  │  ├─ page.tsx                  # Galeri scene AR
│  │  ├─ [id]/
│  │  │  ├─ page.tsx               # AR Viewer (siswa)
│  │  │  └─ edit/page.tsx          # AR Scene Editor (guru)
│  │  └─ create/page.tsx
├─ components/
│  ├─ ar-viewer/
│  │  ├─ ar-marker-viewer.tsx      # MindAR image tracking
│  │  ├─ ar-markerless-viewer.tsx  # WebXR hit-test
│  │  ├─ ar-scene.tsx              # R3F scene wrapper
│  │  └─ ar-asset-node.tsx         # GLB/text/audio node
│  ├─ ar-editor/
│  │  ├─ ar-scene-editor.tsx       # 3D editor (analog CanvasEditor)
│  │  ├─ ar-asset-library.tsx      # Panel upload GLB
│  │  ├─ ar-marker-manager.tsx     # Upload gambar marker, generate .mind
│  │  └─ ar-transform-gizmo.tsx    # Kontrol posisi/rotasi/skala
└─ lib/
   └─ ar/
      ├─ mindar-compiler.ts        # Kompilasi image → .mind (client/worker)
      ├─ glb-optimizer.ts          # Draco/KTX2 optimization hint
      └─ ar-types.ts
```

**Prinsip reuse:** `ar-scene-editor.tsx` mengikuti pola `canvas-editor.tsx` (state, history/undo, layer list, properties panel) — hanya domain berubah dari 2D ke 3D.

---

## 6. Roadmap Pengembangan

### Fase A — AR Viewer MVP (4–6 minggu)
**Tujuan:** Siswa bisa scan gambar di buku → muncul 3D + audio.

- Setup Three.js + R3F + MindAR di route `/ar/[id]`
- Komponen `ARMarkerViewer` (kamera, image tracking, render GLB)
- Reuse komponen audio existing untuk narasi/dialog
- Galeri scene AR (read-only, konten di-seed admin)
- Fallback pesan jika device tidak support kamera/AR
- 2–3 konten demo: peta indonesia, rumah adat, hewan khas Indonesia, alat musik tradisional

**Deliverable:** Demo bisa diakses di `https://panel-edu.digsan.id/ar`.

### Fase B — AR Authoring Tool (6–8 minggu)
**Tujuan:** Guru bisa membuat scene AR sendiri.

- `AR Scene Editor` 3D dengan transform gizmo (posisi/rotasi/skala)
- Upload GLB + preview
- Upload gambar marker + kompilasi `.mind` di client worker
- Attach audio dari Supabase Storage atau rekam langsung
- Link ke sistem `Dialog` existing (tap objek → putar dialog)
- Publish scene ke kelas (reuse permission model)

**Deliverable:** Guru bisa upload gambar halaman buku + objek 3D → dapat lembar marker siap cetak.

### Fase C — Integrasi dengan Panel Cerita (3–4 minggu)
**Tujuan:** Panel cerita 2D bisa punya trigger AR.

- Tambah layer baru `ar-trigger` di CanvasEditor (ikon AR di panel)
- Saat siswa tap → buka AR view dalam modal/fullscreen
- Timeline entry untuk AR trigger (sinkron dengan playback panel)

**Deliverable:** Panel cerita "Rumah Tongkonan" bisa menampilkan rumah 3D AR saat siswa tap.

### Fase D — Fitur Lanjutan (opsional, 4–6 minggu)
- Markerless (WebXR hit-test)
- Spatial audio (Three.js `PositionalAudio`)
- AR quiz / interaksi (tap objek → jawaban benar/salah)
- Analitik AR (berapa kali discan, durasi engagement)
- Multi-marker sekuensial (cerita AR bertahap)
- Export konten ke USDZ untuk AR Quick Look iOS

---

## 7. Prospek Edukasi & Nilai Tambah

### 7.1 Selaras dengan Kurikulum Merdeka
- **Fase A/B Bahasa Indonesia:** cerita rakyat jadi pengalaman imersif → meningkatkan minat baca
- **IPAS:** tata surya, anatomi, ekosistem dalam 3D
- **Seni Budaya:** rumah adat, alat musik, pakaian tradisional sebagai aset 3D
- **Muatan lokal & kearifan lokal** (selaras dengan `review-jurnal-kearifan-lokal.md`)

### 7.2 Keunggulan Diferensial
- **Satu akun, dua produk:** guru tidak perlu belajar platform terpisah
- **Tanpa install aplikasi:** berjalan di browser (PWA), hemat storage HP siswa
- **Konten buatan guru:** bukan katalog tertutup — guru kreatif bisa buat AR sendiri
- **Terintegrasi dengan pembelajaran:** dialog, narasi, timeline, penugasan sama seperti Panel Cerita

### 7.3 Potensi HKI & Publikasi
- AR buatan guru → **bisa jadi sumber penelitian lanjutan** (efektivitas AR vs media konvensional)
- Jurnal Sinta 2/3 terbuka untuk topik AR edukasi SD
- Peluang hibah DIKTI / Kemendikbudristek untuk inovasi EdTech

---

## 8. Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|---|---|---|---|
| Ketersediaan perangkat AR-capable di sekolah terbatas | Sedang | Tinggi | Mode fallback: 3D viewer tanpa kamera (rotasi manual) |
| Ukuran aset 3D terlalu besar untuk koneksi sekolah | Tinggi | Sedang | Pipeline kompresi Draco + KTX2; PWA precache; batas maksimum ukuran per aset |
| iOS WebXR terbatas | Tinggi | Sedang | Pakai MindAR (image tracking) + AR Quick Look fallback |
| Guru kesulitan buat konten 3D | Tinggi | Sedang | Sediakan pustaka GLB gratis (Sketchfab CC0, Poly Pizza); fokus guru pada kombinasi, bukan membuat model 3D dari nol |
| Baterai HP boros saat AR aktif | Sedang | Rendah | Batasi durasi sesi, auto-pause saat tidak aktif |
| Kamera privasi (orang tua khawatir) | Sedang | Sedang | Izin explicit per sesi; tidak ada rekaman video tersimpan; dokumentasi kebijakan privasi |
| Kompleksitas 3D editor untuk guru | Tinggi | Tinggi | Template scene siap pakai, mode "drag GLB ke marker" tanpa perlu atur transform manual |

---

## 9. Estimasi Biaya

### 9.1 Infrastruktur (per bulan)
| Komponen | Saat Ini | Dengan AR | Tambahan |
|---|---|---|---|
| IDCloudHost VPS (2 vCPU/2 GB) | Rp 150.000 | Rp 150.000 | **Rp 0** |
| Supabase Free Tier (1 GB storage) | Rp 0 | Rp 0 (cukup awal) | Rp 0 |
| Supabase Pro (jika > 1 GB) | — | ~Rp 400.000 | Rp 400.000 (baru perlu saat skala besar) |
| CDN (opsional, Cloudflare R2) | — | ~Rp 50.000 | Optional |
| Domain | Sudah ada | Sudah ada | Rp 0 |

**Total tambahan fase MVP: Rp 0–50.000/bulan.**

### 9.2 Development (one-time)
| Fase | Man-month | Asumsi 1 dev mid-level |
|---|---|---|
| Fase A — AR Viewer MVP | 1–1.5 | Rp 10–15 juta |
| Fase B — AR Editor | 1.5–2 | Rp 15–20 juta |
| Fase C — Integrasi Panel | 0.75–1 | Rp 7–10 juta |
| Fase D — Advanced (opsional) | 1–1.5 | Rp 10–15 juta |
| **Total A–C (produksi)** | **~4 bulan** | **~Rp 35–45 juta** |

### 9.3 Konten (opsional)
- 3D model custom (jasa ilustrator): Rp 500 rb–2 juta per model
- Pustaka gratis (Sketchfab CC0, Poly Pizza, KhronosGroup samples) → **Rp 0**
- Perekaman audio narasi: sudah tercover oleh sistem existing

---

## 10. Alternatif: Self-Hosted PostgreSQL di VM IDCloudHost

Saat ini seluruh layanan backend (database, auth, storage, realtime) menggunakan **Supabase Cloud**. Bagian ini menjelaskan skenario alternatif bila database dipindahkan ke **VM PostgreSQL milik sendiri di IDCloudHost** — baik sebagai pengganti penuh Supabase maupun sebagai **shared database VM** yang bisa dipakai aplikasi/web lain di masa depan.

### 10.1 Motivasi & Trade-off

| Aspek | Supabase Cloud (saat ini) | Self-Hosted PostgreSQL VM |
|---|---|---|
| **Kontrol data** | Data di server Supabase (luar Indonesia) | Data di VM IDCloudHost (Indonesia) ✅ |
| **Kedaulatan data (UU PDP)** | Perlu DPA Supabase | Lebih sederhana, data on-premise ✅ |
| **Biaya jangka panjang** | Rp 400 rb/bulan (Pro) saat melebihi free tier | Rp 150–300 rb/bulan flat VM, lebih hemat saat skala besar ✅ |
| **Fitur out-of-the-box** | Auth, Storage, Realtime, RLS, Edge Functions — siap pakai ✅ | Harus dibangun sendiri atau pakai komponen open-source ⚠️ |
| **Maintenance** | 0 effort (managed) ✅ | Backup, patching, monitoring harus dikelola tim ⚠️ |
| **SLA** | 99.9% (Pro) ✅ | Bergantung SLA IDCloudHost + konfigurasi HA |
| **Reusability untuk app lain** | Tiap app = project Supabase baru (bayar per project) | Satu VM, banyak database, banyak app ✅ |
| **Kurva belajar DevOps** | Rendah | Sedang–Tinggi |

**Kapan pilih self-hosted?**
- Sudah ada/berencana punya >1 aplikasi (Panel Cerita, Panel AR, web lain) yang butuh database
- Prioritas kedaulatan data (data pendidikan anak, UU PDP)
- Ingin biaya flat & prediktif saat skala besar
- Tim siap mengelola VM (backup, monitoring)

**Kapan tetap di Supabase?**
- Tim kecil, fokus ke produk bukan infra
- Volume data masih di free tier
- Butuh realtime & storage siap pakai tanpa effort

### 10.2 Komponen Supabase yang Perlu Diganti / Dibangun

Supabase bukan hanya PostgreSQL — ia adalah **suite layanan**. Berikut pemetaan penggantinya untuk skenario self-hosted:

| Fitur Supabase | Dipakai di Panel Gambar? | Penggantinya Self-Hosted |
|---|---|---|
| **PostgreSQL** | ✅ Seluruh data aplikasi | PostgreSQL 16 native di VM |
| **Auth (GoTrue)** | ✅ Login email + Google OAuth | **Better Auth** / **Lucia Auth** / **NextAuth (Auth.js)** di Next.js — langsung ke Postgres |
| **Storage** | ✅ Upload gambar panel, audio, canvas, 3D (AR) | **MinIO** (self-hosted S3) di VM atau **Cloudflare R2** (murah, off-VM) |
| **Row Level Security (RLS)** | ✅ Proteksi data per user/kelas | Tetap pakai RLS native PostgreSQL (bawaan, bukan fitur Supabase) ✅ |
| **Realtime** | Kemungkinan dipakai (live classroom) | **Postgres LISTEN/NOTIFY** + WebSocket custom, atau **Soketi**, atau **Supabase Realtime self-hosted** |
| **Edge Functions** | Belum dipakai masif | Next.js API routes (sudah ada) ✅ |
| **Dashboard SQL Editor** | Dev convenience | **pgAdmin 4** / **DBeaver** / `psql` |
| **Auto-generated REST API** | Tidak dipakai (app akses langsung via `@supabase/supabase-js`) | Next.js API routes + Prisma/Drizzle ORM |

### 10.3 Perubahan di Codebase Panel Gambar

Saat ini klien Supabase diinisialisasi di:

```
app/src/lib/supabase/
├─ client.ts       # browser client
├─ server.ts       # server client (SSR)
└─ middleware.ts   # session refresh
```

Strategi migrasi **bertahap (incremental)**, tidak perlu rewrite sekaligus:

**Fase M1 — Database saja (paling mudah):**
- Migrasi schema + data Postgres dari Supabase ke VM (gunakan `pg_dump` → `pg_restore`)
- Ganti `DATABASE_URL` di `.env` ke VM baru
- Tetap pakai klien Supabase untuk query (hanya ganti connection string Postgres di project Supabase, atau pindah ke ORM sama sekali)
- **Alternatif paling bersih:** masukkan **Drizzle ORM** atau **Prisma** untuk semua query, lepaskan SDK `@supabase/supabase-js` bertahap

**Fase M2 — Auth:**
- Pasang **Better Auth** atau **Auth.js** yang langsung pakai Postgres VM
- Mapping tabel `auth.users` Supabase ke schema auth baru
- Update `middleware.ts` + session handling
- Update OAuth Google callback URL (sudah di-setup di `https://panel-edu.digsan.id/auth/callback`, tinggal arahkan ke handler baru)

**Fase M3 — Storage:**
- Deploy **MinIO** di VM yang sama atau VM terpisah
- Ganti `supabase.storage.from(...).upload(...)` dengan klien S3 (`@aws-sdk/client-s3`) — MinIO kompatibel S3 API
- Atau migrasi ke **Cloudflare R2** (zero egress fee, lebih murah bandwidth ke siswa)
- Script migrasi file existing: download dari Supabase Storage → upload ke target baru, update URL di DB

**Fase M4 — Realtime (jika dipakai):**
- Replace Supabase Realtime dengan **Postgres LISTEN/NOTIFY** di-wrap WebSocket server (Socket.IO/ws)
- Atau deploy **Soketi** (self-hosted Pusher-compatible) di VM

Perubahan kode per fase bersifat **lokal** (hanya di `lib/supabase/` + `lib/auth/` + `lib/storage/`) — logic bisnis di komponen tidak berubah karena diabstraksikan di balik repository/service layer.

### 10.4 Arsitektur VM PostgreSQL yang Reusable untuk Banyak Aplikasi

Kunci agar VM bisa dipakai **Panel Gambar + Panel AR + web lain di masa depan** adalah **isolasi per aplikasi** di dalam satu instance PostgreSQL.

#### Pola Arsitektur yang Direkomendasikan

```
                    ┌────────────────────────────────────────┐
                    │   VM IDCloudHost — "digsanid-db"       │
                    │   Ubuntu 24.04 LTS · 2 vCPU · 4 GB RAM │
                    │                                         │
                    │   ┌─────────────────────────────────┐  │
                    │   │  PostgreSQL 16 (port 5432)       │  │
                    │   │  ┌──────────────┐ ┌───────────┐ │  │
                    │   │  │ DB: panel_edu│ │ DB: app_X │ │  │
                    │   │  │ user: pe_app │ │user:x_app │ │  │
                    │   │  └──────────────┘ └───────────┘ │  │
                    │   │  ┌──────────────┐ ┌───────────┐ │  │
                    │   │  │ DB: panel_ar │ │ DB: app_Y │ │  │
                    │   │  │ user: ar_app │ │user:y_app │ │  │
                    │   │  └──────────────┘ └───────────┘ │  │
                    │   └─────────────────────────────────┘  │
                    │   PgBouncer (port 6432) — connection   │
                    │   pooling untuk semua DB               │
                    │                                         │
                    │   pgBackRest / cron pg_dump → S3/R2    │
                    │   Prometheus + postgres_exporter       │
                    └────────────────────────────────────────┘
                                    ▲
                    ┌───────────────┼───────────────────────┐
                    │               │                       │
            ┌───────┴──────┐ ┌──────┴───────┐      ┌────────┴──────┐
            │ VM App #1    │ │ VM App #2    │      │ VM App #3     │
            │ Panel Gambar │ │ Panel AR     │      │ Web masa depan│
            │ Next.js+PM2  │ │ Next.js+PM2  │      │ ...           │
            └──────────────┘ └──────────────┘      └───────────────┘
```

#### Prinsip Isolasi

| Level | Implementasi | Manfaat |
|---|---|---|
| **1 database per aplikasi** | `CREATE DATABASE panel_edu;` `CREATE DATABASE panel_ar;` | Schema, migration, backup terisolasi |
| **1 role/user per aplikasi** | `CREATE ROLE pe_app LOGIN PASSWORD '…';` `GRANT ALL ON DATABASE panel_edu TO pe_app;` `REVOKE ALL ON DATABASE panel_edu FROM PUBLIC;` | Aplikasi hanya bisa akses DB-nya sendiri |
| **`pg_hba.conf` ketat** | Allow hanya dari IP VM app yang diizinkan (private network IDCloudHost) | Tidak bisa diakses sembarang tempat |
| **Listen hanya di private network** | `listen_addresses = '10.x.x.x'` (internal IDCloudHost), bukan public IP | Tidak exposed ke internet |
| **PgBouncer pooling** | Port 6432, mode `transaction` | Hemat koneksi saat banyak app/worker; Next.js serverless-friendly |
| **Schema per modul (opsional)** | Dalam 1 database, `CREATE SCHEMA auth; CREATE SCHEMA public; CREATE SCHEMA ar;` | Organisasi domain jelas (niru pola Supabase) |
| **Role membership grup** | `CREATE ROLE app_readonly;` untuk analytics/BI | Third-party BI tool (Metabase) bisa akses read-only lintas DB |

#### Komponen Pendukung yang Dipasang Sekali, Dipakai Semua App

| Komponen | Fungsi | Port |
|---|---|---|
| **PostgreSQL 16** | Database utama | 5432 (internal) |
| **PgBouncer** | Connection pooling | 6432 |
| **pgBackRest** | Backup incremental terenkripsi → S3/R2 | — |
| **MinIO** (opsional, bisa VM terpisah) | Object storage S3-compatible untuk semua app | 9000 |
| **pgAdmin 4** (di balik Nginx + Basic Auth) | Web admin DB | 5050 → `db-admin.digsan.id` |
| **Postgres Exporter + Prometheus + Grafana** | Monitoring query, koneksi, disk | 9187 / 9090 / 3001 |
| **UFW firewall** | Hanya allow SSH (22) + HTTPS (443) dari publik | — |

#### Spesifikasi VM yang Disarankan

| Skala | vCPU | RAM | Disk | Estimasi Biaya IDCloudHost |
|---|---|---|---|---|
| **MVP / Dev** | 2 | 2 GB | 40 GB SSD | ~Rp 150.000/bln |
| **Produksi awal (1–3 app)** | 2 | 4 GB | 80 GB SSD | ~Rp 300.000/bln |
| **Produksi matang (>5 app, 10k user)** | 4 | 8 GB | 160 GB SSD | ~Rp 600.000/bln |
| **High availability (primary + replica)** | 2× VM produksi | — | — | ~Rp 1.200.000/bln |

> Disarankan **mulai dari tier produksi awal (2 vCPU/4 GB/80 GB)** agar cukup untuk Panel Gambar + Panel AR tanpa perlu resize dalam 1–2 tahun.

### 10.5 Checklist Implementasi VM PostgreSQL Shared

**Setup awal (one-time):**
- [ ] Provision VM IDCloudHost Ubuntu 24.04 LTS (tier produksi awal)
- [ ] Hardening: non-root user, SSH key-only, UFW firewall, fail2ban
- [ ] Install PostgreSQL 16 (`apt install postgresql-16`)
- [ ] Konfigurasi `postgresql.conf`: `listen_addresses`, `max_connections`, `shared_buffers` (25% RAM), `work_mem`, `effective_cache_size`
- [ ] Konfigurasi `pg_hba.conf`: allow hanya dari IP VM app via private network, `scram-sha-256`
- [ ] Install PgBouncer (`apt install pgbouncer`), konfigurasi pool mode transaction
- [ ] Setup TLS internal (self-signed CA atau Let's Encrypt internal) jika lalu-lintas lintas VM
- [ ] Setup pgBackRest + cron harian + retensi 30 hari → S3/R2
- [ ] Setup Postgres Exporter + Grafana dashboard
- [ ] Dokumentasikan runbook: restore backup, rotasi password, scaling

**Per aplikasi baru:**
- [ ] `CREATE DATABASE nama_app;`
- [ ] `CREATE ROLE nama_app_user LOGIN PASSWORD '…';`
- [ ] `GRANT ALL PRIVILEGES ON DATABASE nama_app TO nama_app_user;`
- [ ] Tambahkan entry di PgBouncer `databases.ini`
- [ ] Tambahkan IP VM aplikasi ke `pg_hba.conf`
- [ ] Simpan credential di secret manager (Bitwarden/1Password) — **jangan commit ke git**
- [ ] Tambahkan backup policy (pgBackRest stanza per database)
- [ ] Test connection dari VM aplikasi via PgBouncer (port 6432)

**Migrasi Panel Gambar dari Supabase:**
- [ ] `pg_dump` dari Supabase → file `.sql`
- [ ] `pg_restore` ke database `panel_edu` di VM
- [ ] Download semua file storage Supabase → upload ke MinIO/R2
- [ ] Script update URL storage di tabel `panels`, `dialogs`, `stories`
- [ ] Switch auth provider (NextAuth/Better Auth)
- [ ] Update `.env.production` di app VM
- [ ] Testing end-to-end di staging subdomain
- [ ] Cutover production (downtime maintenance ~30 menit)
- [ ] Monitoring 1 minggu, pertahankan Supabase project sebagai fallback sebelum dihapus

### 10.6 Manfaat Menggunakan VM Shared untuk Aplikasi Lain

Setelah VM PostgreSQL shared berdiri, menambah aplikasi baru (misal: web sekolah, LMS, dashboard analitik) cukup:

1. Buat database + user baru (5 menit)
2. Tambah entry di PgBouncer (2 menit)
3. Koneksikan aplikasi baru → **biaya database = Rp 0 tambahan** selama VM masih muat

Dibandingkan bikin project Supabase baru per aplikasi (@Rp 400 rb/bln/project), penghematan signifikan muncul saat portofolio app bertambah:

| Jumlah App | Supabase Cloud (Pro) | VM Shared IDCloudHost |
|---|---|---|
| 1 app | Rp 400 rb/bln | Rp 300 rb/bln |
| 3 app | Rp 1.200 rb/bln | Rp 300 rb/bln |
| 5 app | Rp 2.000 rb/bln | Rp 600 rb/bln (upgrade VM) |
| 10 app | Rp 4.000 rb/bln | Rp 600 rb–1.2 jt/bln |

**Break-even kira-kira di aplikasi ke-2.**

### 10.7 Risiko Self-Hosted & Mitigasi

| Risiko | Mitigasi |
|---|---|
| **Data loss karena disk failure** | Backup harian pgBackRest ke S3/R2 off-site; test restore bulanan |
| **Single point of failure (1 VM)** | Fase lanjut: setup streaming replication ke VM kedua; failover manual/automated |
| **Patching & security update lupa dilakukan** | `unattended-upgrades` Ubuntu; schedule maintenance bulanan |
| **Serangan brute force koneksi DB** | `listen_addresses` hanya private network; `fail2ban`; password 32+ karakter |
| **VM kehabisan disk** | Monitoring Grafana alert di 70% disk; `VACUUM`/`pg_repack` rutin; arsip log lama |
| **Query aplikasi satu membebani app lain** | `CONNECTION LIMIT` per role; PgBouncer pool size per DB; query timeout per user |
| **Tim kurang pengalaman DBA** | Runbook tertulis; pakai managed PostgreSQL (Aiven/Neon) sebagai jembatan saat peak workload |

### 10.8 Rekomendasi untuk Kasus Panel Gambar + Panel AR

Dengan melihat bahwa roadmap sudah akan punya **2 aplikasi paralel (Panel Cerita + Panel AR)**, dan kemungkinan web/aplikasi lain di masa depan (LMS, dashboard admin sekolah, web promosi), **strategi VM PostgreSQL shared lebih ekonomis dan fleksibel** dalam jangka menengah (1–3 tahun).

**Usulan konkret:**

1. **Fase saat ini (MVP Panel AR):** **tetap di Supabase** — fokus energi ke produk, bukan infra.
2. **Saat Panel AR mulai diadopsi atau aplikasi ke-2 mulai dirancang:** provision VM PostgreSQL shared di IDCloudHost (ikuti checklist 10.5).
3. **Migrasi bertahap Panel Gambar ke VM** (Fase M1 → M4 di 10.3) dilakukan sekali, lalu Panel AR dan app berikutnya **langsung di-onboard ke VM shared** sejak hari pertama.
4. **Supabase masih bisa dipakai selektif** untuk fitur yang sulit di-self-host (misal realtime multiplayer kompleks) → pola **hybrid** valid.

---

## 11. Kesimpulan & Rekomendasi

### 11.1 Kelayakan Berjalan dengan Spec Saat Ini

| Dimensi | Status | Catatan |
|---|---|---|
| **Arsitektur aplikasi** | ✅ Sangat layak | Next.js + Supabase + PWA ideal untuk WebAR |
| **Server IDCloudHost** | ✅ Tidak perlu upgrade | Rendering AR di klien |
| **Storage Supabase** | ✅ Free tier cukup di fase awal | Upgrade ke Pro saat > 1 GB aset |
| **Browser pengguna** | ✅ 90%+ HP siswa Indonesia 2024+ support | Ada fallback untuk device lama |
| **Biaya tambahan infrastruktur** | ✅ Mendekati Rp 0 di MVP | Hanya scale-up saat adopsi tinggi |
| **Kurva belajar tim** | ⚠️ Perlu upskill Three.js/R3F | 2–4 minggu ramp-up |
| **Konten 3D** | ⚠️ Perlu kurasi awal | Pakai aset CC0 + guru kreator |

### 11.2 Rekomendasi Langkah Awal

1. **Spike teknis 1–2 minggu** — buat proof-of-concept MindAR di route `/ar/demo` dengan 1 marker + 1 GLB + audio, verifikasi jalan di HP siswa riil (bawa ke sekolah mitra).
2. **Validasi user dengan 2–3 guru mitra** — tunjukkan demo, gali respon dan skenario penggunaan yang realistis.
3. **Keputusan lanjut/tunda** berdasarkan hasil spike + validasi. Jika lanjut, masuk Fase A penuh.
4. **Paralelisasi dengan Panel Cerita** — fitur Panel Cerita terus disempurnakan; AR jalan di branch/feature flag terpisah sampai matang.
5. **Kurasi pustaka 3D CC0 sejak awal** — minimal 20 objek lintas mata pelajaran agar guru langsung bisa eksplorasi saat Fase B selesai.

### 11.3 Kalimat Penutup

Panel AR **bukan perubahan paradigma yang membongkar aplikasi** — melainkan **ekstensi alami** dari Panel Cerita. Dengan pola UX yang sama (editor untuk guru, viewer untuk siswa, reuse dialog/audio/kelas), Panel Gambar dapat berevolusi menjadi platform media pembelajaran **multimodal** (2D cerita + 3D AR) yang kompetitif secara nasional tanpa menambah kompleksitas operasional yang signifikan.

Rekomendasi final: **lanjutkan dengan spike teknis 2 minggu**, lalu evaluasi untuk masuk ke Fase A.

---

## Lampiran — Referensi Teknis

- MindAR.js — https://hiukim.github.io/mind-ar-js-doc/
- Three.js — https://threejs.org/
- React Three Fiber — https://r3f.docs.pmnd.rs/
- Google model-viewer — https://modelviewer.dev/
- WebXR Device API — https://immersiveweb.dev/
- glTF / Draco / KTX2 — https://www.khronos.org/gltf/
- Pustaka 3D CC0: Sketchfab (filter CC0), Poly Pizza (https://poly.pizza), KhronosGroup/glTF-Sample-Models
- USDZ (iOS AR) — https://developer.apple.com/augmented-reality/quick-look/
