# Teknologi & Platform — Panel Gambar Bersuara

---

## 1. Prinsip Pemilihan Teknologi

Pemilihan teknologi didasarkan pada kebutuhan utama aplikasi:

| Kebutuhan | Implikasi Teknis |
|-----------|-----------------|
| Lintas perangkat (smartphone → IFP) | Teknologi *web-based* / PWA agar satu codebase untuk semua platform |
| Interaktif & responsif | Framework SPA (Single Page Application) modern |
| Rekaman suara guru & siswa | Web Audio API / MediaRecorder API |
| Pemutaran audio (narasi, dialog, latar) | HTML5 Audio / Web Audio API |
| Pembuatan panel cerita oleh guru | Canvas-based editor atau drag-and-drop builder |
| Akses offline di sekolah minim internet | Service Worker (PWA) + local storage |
| Mudah di-deploy & di-maintain | Cloud-native deployment, CI/CD |

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser / PWA)                │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Panel    │  │ Authoring │  │ Audio Engine         │  │
│  │ Viewer   │  │ Tool      │  │ (Record/Play/Mix)    │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
│                    ↕ REST / WebSocket                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   BACKEND (API Server)                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Auth &   │  │ Panel     │  │ Media / File         │  │
│  │ User Mgmt│  │ CRUD API  │  │ Storage API          │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
│                    ↕                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Database + Object Storage            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Framework** | **Next.js 14+** (React) | SSR/SSG, optimasi performa, ekosistem besar |
| **Bahasa** | TypeScript | Type safety, meminimalkan bug, produktivitas |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, konsisten, responsive |
| **State Management** | Zustand / React Context | Ringan, mudah digunakan untuk skala aplikasi ini |
| **Ikon** | Lucide React | Ringan, lengkap, konsisten |
| **Canvas / Editor** | Konva.js (react-konva) | Manipulasi canvas untuk panel editor (drag, resize, layer) |
| **Audio** | Howler.js + MediaRecorder API | Pemutaran & perekaman audio yang andal lintas browser |
| **Drag & Drop** | dnd-kit | Aksesibel, performa tinggi, React-native |
| **Rich Text** | Tiptap (ProseMirror) | Editor teks untuk dialog/narasi dengan formatting |
| **PWA** | next-pwa (Workbox) | Dukungan offline, install ke home screen |
| **Animasi** | Framer Motion | Transisi panel, animasi dialog yang halus |

### 3.2 Backend

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Runtime** | Node.js 20 LTS | Ekosistem JavaScript terpadu, performa tinggi |
| **Framework** | Express.js / Fastify | Ringan, mature, middleware ecosystem |
| **Bahasa** | TypeScript | Konsisten dengan frontend |
| **Authentication** | NextAuth.js / Lucia Auth | Autentikasi aman, mendukung berbagai provider |
| **API** | REST + tRPC (opsional) | REST untuk simplicity, tRPC untuk type-safe calls |
| **Realtime** | Socket.IO (opsional) | Untuk fitur kolaborasi real-time (tahap lanjut) |

### 3.3 Database & Storage

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Database** | PostgreSQL (via Supabase / Neon) | Relational, JSONB support, robust, free tier |
| **ORM** | Prisma | Type-safe queries, migrasi mudah, integrasi TS |
| **Object Storage** | Supabase Storage / Cloudflare R2 | Penyimpanan gambar & file audio, murah/gratis |
| **Cache** | Redis (Upstash) | Caching session & data panel yang sering diakses |

### 3.4 DevOps & Deployment

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| **Hosting Frontend** | Vercel / Netlify | Optimasi Next.js, CDN global, free tier |
| **Hosting Backend** | Railway / Render / Fly.io | Container-based, auto-scaling, free tier |
| **CI/CD** | GitHub Actions | Automasi testing, build, dan deploy |
| **Version Control** | Git + GitHub | Standar industri, kolaborasi |
| **Monitoring** | Sentry (error tracking) | Deteksi dan pelacakan error di production |
| **Analytics** | Plausible / Umami | Privacy-friendly, memantau penggunaan |

### 3.5 Testing

| Jenis Test | Teknologi | Cakupan |
|------------|-----------|---------|
| **Unit Test** | Vitest | Fungsi utilitas, logic bisnis |
| **Component Test** | React Testing Library | Komponen UI |
| **E2E Test** | Playwright | Alur pengguna end-to-end |
| **API Test** | Supertest | Endpoint API |
| **Accessibility** | axe-core / pa11y | Uji aksesibilitas WCAG |

---

## 4. Fitur Teknis Kunci

### 4.1 Audio Engine
- **Perekaman suara** melalui `MediaRecorder API` (format WebM/Opus atau WAV)
- **Pemutaran multi-track** menggunakan `Howler.js` (suara latar + dialog secara simultan)
- **Visualisasi audio** (waveform) menggunakan `Web Audio API` untuk feedback saat merekam
- **Kompresi & konversi** audio di sisi klien sebelum upload untuk menghemat bandwidth

### 4.2 Panel Editor (Authoring Tool)
- **Canvas berbasis `react-konva`** untuk menempatkan gambar, buble dialog, dan elemen narasi
- **Drag & drop** elemen ke panel menggunakan `dnd-kit`
- **Template panel** yang sudah siap pakai untuk mempercepat pembuatan konten
- **Upload gambar** dengan crop & resize otomatis
- **Layer management** (gambar di bawah, dialog di atas, dll.)

### 4.3 Progressive Web App (PWA)
- **Installable** di semua perangkat (smartphone, tablet, PC, Smartboard)
- **Offline-first** — konten panel yang sudah diunduh tersedia tanpa internet
- **Responsive design** — menyesuaikan ukuran layar dari 4" hingga 86" (IFP)
- **Touch-optimized** — mendukung gestur sentuh untuk Smartboard/tablet

### 4.4 Aksesibilitas
- Navigasi keyboard penuh
- Dukungan screen reader (ARIA labels)
- Kontras warna sesuai WCAG 2.1 AA
- Ukuran font dan elemen UI yang dapat diperbesar
- Mode gelap (*dark mode*) opsional

---

## 5. Kebutuhan Infrastruktur Minimum

### Untuk Pengembangan (Developer)
- Node.js 20 LTS
- npm / pnpm
- Git
- VS Code / IDE lainnya
- PostgreSQL (lokal atau cloud)

### Untuk Pengguna (Sekolah)
| Perangkat | Spesifikasi Minimum |
|-----------|-------------------|
| **Smartphone** | Android 8+ / iOS 14+, Chrome/Safari terbaru |
| **Tablet** | Android 8+ / iPadOS 14+, 2 GB RAM |
| **Laptop/PC** | Browser modern (Chrome 90+, Firefox 90+, Edge 90+) |
| **Smartboard/IFP** | Browser bawaan berbasis Chromium, layar sentuh |
| **Internet** | Dibutuhkan untuk sinkronisasi; mode offline tersedia setelah konten diunduh |
| **Mikrofon** | Diperlukan untuk fitur perekaman suara |
| **Speaker** | Diperlukan untuk pemutaran audio |

---

## 6. Estimasi Biaya Infrastruktur (Tahap Awal)

| Layanan | Tier | Estimasi Biaya/Bulan |
|---------|------|---------------------|
| Vercel (Frontend) | Hobby/Pro | Gratis – $20 |
| Railway (Backend) | Starter | Gratis – $5 |
| Supabase (DB + Storage) | Free/Pro | Gratis – $25 |
| Upstash Redis | Free | Gratis |
| Domain (.id) | — | ~Rp 100.000/tahun |
| **Total estimasi** | | **Gratis – ~$50/bulan** |

> Pada tahap prototipe dan uji coba, seluruh layanan dapat menggunakan free tier sehingga biaya infrastruktur mendekati nol.

---

## 7. Diagram Alur Data (Data Flow)

```
Guru membuat panel cerita
    │
    ▼
[Authoring Tool] ──upload gambar──▶ [Object Storage]
    │                                     │
    ├──simpan metadata panel──▶ [PostgreSQL Database]
    │                                     │
    ▼                                     ▼
Siswa membuka panel cerita ◀── fetch data + aset ──┘
    │
    ├── Melihat panel gambar berurutan
    ├── Membaca dialog/narasi
    ├── Mendengarkan audio (suara latar + narasi guru)
    ├── Merekam suara sendiri ──▶ [Object Storage]
    │
    ▼
Guru meninjau rekaman siswa ◀── fetch audio siswa ──┘
    │
    ▼
Evaluasi & Feedback
```

---

## 8. Keamanan

| Aspek | Implementasi |
|-------|-------------|
| **Autentikasi** | Login berbasis email/Google, hashed password (bcrypt/argon2) |
| **Otorisasi** | Role-based access control (Guru, Siswa, Admin) |
| **Data siswa** | Enkripsi data sensitif, kepatuhan terhadap UU PDP (Perlindungan Data Pribadi) |
| **File upload** | Validasi tipe & ukuran file, scan malware |
| **HTTPS** | Wajib di seluruh endpoint |
| **CORS** | Whitelist domain yang diizinkan |
| **Rate limiting** | Mencegah abuse pada API |
