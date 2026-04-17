# Panel Gambar Bersuara — Prototype

Aplikasi media pembelajaran interaktif untuk membangun kecintaan membaca dan menyuarakan Bahasa Indonesia di Sekolah Dasar.

## Fitur Prototype

- **Landing Page** — halaman depan dengan informasi aplikasi
- **Auth** — registrasi & login guru/siswa via Supabase Auth
- **Dashboard Guru** — kelola cerita, kelas, lihat statistik
- **Dashboard Siswa** — lihat cerita tersedia, baca & rekam suara
- **Authoring Tool** — guru bisa membuat cerita panel, upload gambar, tambah dialog/narasi/audio
- **Panel Viewer** — siswa membaca cerita panel per panel dengan dialog interaktif
- **Audio Engine** — rekam suara siswa (MediaRecorder API) & putar audio (HTML5 Audio)
- **Responsif** — mendukung smartphone, tablet, laptop, PC, hingga Smartboard

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Backend/DB:** Supabase (Auth, PostgreSQL, Storage)
- **Audio:** MediaRecorder API + HTML5 Audio
- **Deployment:** Vercel (free tier)

## Setup Lokal

### 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) dan buat project baru (gratis).
2. Buka **SQL Editor** di dashboard Supabase.
3. Copy-paste isi file `supabase-schema.sql` dan jalankan (Run).

### 2. Konfigurasi environment

```bash
cp .env.local.example .env.local
```

Isi `.env.local` dengan kredensial Supabase Anda:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Credential bisa ditemukan di **Supabase Dashboard → Settings → API**.

### 3. Install & jalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### 4. Seed demo data (opsional)

Setelah app berjalan, kirim POST request ke `/api/seed`:

```bash
curl -X POST http://localhost:3000/api/seed
```

Ini akan membuat:
- Akun guru demo: `guru@demo.id` / `demo1234`
- Akun siswa demo: `siswa@demo.id` / `demo1234`
- 2 cerita panel lengkap dengan dialog
- 1 kelas demo

## Deploy ke Vercel

1. Push repository ke GitHub.
2. Buka [vercel.com](https://vercel.com), import repository.
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy.

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   ├── seed/route.ts         # Seed demo data
│   │   └── upload/route.ts       # File upload handler
│   ├── dashboard/page.tsx        # Dashboard guru/siswa
│   ├── login/page.tsx            # Halaman login
│   ├── register/page.tsx         # Halaman registrasi
│   ├── stories/
│   │   ├── page.tsx              # Daftar cerita
│   │   ├── create/page.tsx       # Buat cerita baru
│   │   └── [id]/
│   │       ├── page.tsx          # Panel viewer (baca cerita)
│   │       └── edit/page.tsx     # Edit cerita (authoring tool)
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page
│   └── globals.css
├── components/
│   ├── audio/
│   │   ├── audio-player.tsx      # Pemutar audio
│   │   └── audio-recorder.tsx    # Perekam suara
│   ├── layout/
│   │   └── navbar.tsx            # Navigasi utama
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── textarea.tsx
└── lib/
    ├── supabase/
    │   ├── client.ts             # Browser Supabase client
    │   ├── middleware.ts         # Auth middleware helper
    │   └── server.ts            # Server Supabase client
    ├── types.ts                  # TypeScript interfaces
    └── utils.ts                  # Utility functions
```

## Akun Demo

| Peran | Email | Password |
|-------|-------|----------|
| Guru | guru@demo.id | demo1234 |
| Siswa | siswa@demo.id | demo1234 |

## Lisensi

Hak cipta © 2026. Seluruh hak dilindungi undang-undang.
