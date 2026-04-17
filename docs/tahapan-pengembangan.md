# Tahapan Pengembangan — Panel Gambar Bersuara

---

## Ringkasan Timeline

```
FASE 1: PERSIAPAN & RISET          ══════  (Minggu 1–4)
FASE 2: DESAIN & PROTOTIPE         ══════  (Minggu 5–10)
FASE 3: PENGEMBANGAN (MVP)         ══════════════  (Minggu 11–22)
FASE 4: VALIDASI AHLI              ════    (Minggu 23–26)
FASE 5: UJI COBA & ITERASI         ══════  (Minggu 27–32)
FASE 6: FINALISASI & PUBLIKASI     ════    (Minggu 33–36)
```

**Total estimasi: 36 minggu (~9 bulan)**

---

## FASE 1: PERSIAPAN & RISET (Minggu 1–4)

### 1.1 Studi Literatur & Kajian Pustaka
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Review jurnal terkait media pembelajaran interaktif | Matriks literatur review | Peneliti |
| Review jurnal terkait membaca nyaring & literasi SD | Sintesis teori | Peneliti |
| Analisis aplikasi sejenis yang sudah ada | Competitive analysis document | Peneliti + Developer |
| Pemetaan teori Multimedia Learning (Mayer) | Kerangka teori | Peneliti |

### 1.2 Analisis Kebutuhan
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Observasi pembelajaran Bahasa Indonesia di 2–3 SD | Catatan observasi, foto/video | Peneliti |
| Wawancara guru kelas 1–4 (min. 5 guru) | Transkrip wawancara | Peneliti |
| Survei ketersediaan perangkat teknologi di sekolah | Data infrastruktur sekolah | Peneliti |
| Identifikasi kemampuan digital guru | Profil kompetensi TIK guru | Peneliti |
| Analisis Capaian Pembelajaran Bahasa Indonesia Fase A & B | Pemetaan CP relevan | Peneliti |

### 1.3 Penyusunan Proposal & Instrumen
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Penyusunan proposal penelitian R&D | Dokumen proposal | Peneliti |
| Penyusunan instrumen validasi ahli (media, materi, bahasa) | 3 set angket validasi | Peneliti |
| Penyusunan instrumen pre-test & post-test | Instrumen minat baca + rubrik fluensi | Peneliti |
| Pengajuan izin penelitian ke sekolah & dinas | Surat izin | Peneliti |

**Milestone Fase 1:** ✅ Proposal lengkap, instrumen tervalidasi, izin penelitian diperoleh.

---

## FASE 2: DESAIN & PROTOTIPE (Minggu 5–10)

### 2.1 Desain Konsep Aplikasi
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Penyusunan user persona (Guru, Siswa, Admin) | Dokumen user persona | UX Researcher |
| Penyusunan user story & use case | Daftar user story | Product Owner |
| Penyusunan information architecture (IA) | Sitemap aplikasi | UX Designer |
| Perancangan user flow untuk setiap peran | Diagram user flow | UX Designer |

### 2.2 Desain UI/UX
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Wireframe low-fidelity (sketsa) | Wireframe sketsa | UX Designer |
| Wireframe high-fidelity (Figma) | File Figma | UI Designer |
| Desain visual (UI Kit: warna, tipografi, ikon, komponen) | Design system | UI Designer |
| Prototipe interaktif (Figma prototype) | Link prototipe Figma | UI Designer |
| Usability testing prototipe dengan 3–5 guru | Laporan usability test | UX Researcher |
| Iterasi desain berdasarkan feedback | Desain final | UI Designer |

### 2.3 Desain Teknis
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Perancangan arsitektur sistem | Diagram arsitektur | Lead Developer |
| Perancangan database schema (ERD) | ERD + Prisma schema | Backend Developer |
| Perancangan API specification | OpenAPI / Swagger doc | Backend Developer |
| Setup repository & project structure | GitHub repo | Lead Developer |
| Setup CI/CD pipeline | GitHub Actions config | DevOps |

### 2.4 Desain Konten
| Aktivitas | Output | PIC |
|-----------|--------|-----|
| Perancangan template panel cerita | 3–5 template panel | Content Designer |
| Pembuatan storyboard cerita prototipe | Storyboard 2–3 cerita | Content Designer + Guru |
| Penyusunan naskah dialog & narasi | Naskah teks | Content Writer |
| Pembuatan/kurasi gambar ilustrasi | Set gambar prototipe | Ilustrator |
| Perekaman audio narasi guru (sample) | File audio sample | Guru + Audio Engineer |

**Milestone Fase 2:** ✅ Desain UI/UX final, arsitektur teknis, storyboard konten, repository siap.

---

## FASE 3: PENGEMBANGAN MVP (Minggu 11–22)

### Sprint 1–2 (Minggu 11–14): Fondasi
| Aktivitas | Output |
|-----------|--------|
| Setup Next.js project + Tailwind + shadcn/ui | Boilerplate siap |
| Implementasi layout responsif (mobile → IFP) | Layout system |
| Implementasi autentikasi (login guru, siswa) | Auth flow |
| Setup database (Supabase/PostgreSQL) + Prisma schema | DB ready |
| Implementasi API dasar (CRUD panel, user) | REST endpoints |
| Setup object storage untuk gambar & audio | Storage ready |

### Sprint 3–4 (Minggu 15–18): Fitur Inti
| Aktivitas | Output |
|-----------|--------|
| Panel Viewer — tampilkan rangkaian panel cerita | Viewer functional |
| Panel Viewer — tampilkan dialog/buble & narasi per panel | Dialog/narasi functional |
| Audio Engine — pemutaran audio narasi & suara latar | Playback functional |
| Audio Engine — perekaman suara siswa | Recording functional |
| Authoring Tool — editor panel dasar (upload gambar, tambah dialog) | Editor MVP |
| Authoring Tool — tambah narasi teks + audio | Narasi feature |

### Sprint 5–6 (Minggu 19–22): Fitur Pelengkap & Polish
| Aktivitas | Output |
|-----------|--------|
| Authoring Tool — template panel & drag-and-drop | Template system |
| Dashboard guru (kelola panel, lihat rekaman siswa) | Guru dashboard |
| Dashboard siswa (daftar cerita, progres) | Siswa dashboard |
| PWA setup (offline, installable) | PWA enabled |
| Accessibility audit & perbaikan | WCAG AA compliance |
| Performance optimization | Lighthouse score ≥ 90 |
| Konten prototipe (2–3 cerita panel lengkap) | Konten siap uji |
| Internal QA & bug fixing | Bug-free MVP |

**Milestone Fase 3:** ✅ MVP fungsional dengan konten prototipe, siap validasi ahli.

---

## FASE 4: VALIDASI AHLI (Minggu 23–26)

### 4.1 Validasi Ahli Media (2 validator)
| Aspek yang Dinilai | Indikator |
|-------------------|-----------|
| Tampilan visual | Kualitas desain, konsistensi, estetika |
| Navigasi & interaksi | Kemudahan navigasi, responsivitas |
| Kualitas audio | Kejelasan suara, kontrol volume |
| Kompatibilitas | Berjalan baik di berbagai perangkat |
| Fitur authoring tool | Kemudahan pembuatan panel oleh guru |

### 4.2 Validasi Ahli Materi (2 validator)
| Aspek yang Dinilai | Indikator |
|-------------------|-----------|
| Kesesuaian dengan CP Bahasa Indonesia | Relevansi konten dengan kurikulum |
| Kualitas konten cerita | Kesesuaian tema, bahasa, dan nilai |
| Kebenaran materi | Akurasi informasi dan konsep |
| Metodologi pembelajaran | Kesesuaian pendekatan pedagogi |

### 4.3 Validasi Ahli Bahasa (1 validator)
| Aspek yang Dinilai | Indikator |
|-------------------|-----------|
| Ketepatan penggunaan bahasa | EYD V, struktur kalimat |
| Kesesuaian level bahasa | Sesuai tingkat perkembangan siswa SD |
| Kejelasan instruksi | Instruksi mudah dipahami siswa & guru |

### 4.4 Revisi Produk
| Aktivitas | Output |
|-----------|--------|
| Kompilasi masukan dari seluruh validator | Daftar revisi |
| Implementasi revisi | Produk revisi 1 |
| Konfirmasi validator (jika diperlukan validasi ulang) | Validasi final |

**Milestone Fase 4:** ✅ Produk tervalidasi ahli dengan kategori minimal "Baik".

---

## FASE 5: UJI COBA & ITERASI (Minggu 27–32)

### 5.1 Uji Coba Terbatas / Small Group Trial (Minggu 27–28)
| Aktivitas | Detail |
|-----------|--------|
| Subjek | 10–15 siswa SD + 2–3 guru |
| Durasi | 1–2 minggu (3–4 sesi pembelajaran) |
| Instrumen | Angket respons, observasi, wawancara |
| Output | Data respons + daftar perbaikan |

### 5.2 Revisi Produk Tahap 2 (Minggu 29)
| Aktivitas | Output |
|-----------|--------|
| Analisis data uji coba terbatas | Laporan temuan |
| Implementasi perbaikan | Produk revisi 2 |

### 5.3 Uji Coba Lapangan / Field Trial (Minggu 30–32)
| Aktivitas | Detail |
|-----------|--------|
| Subjek | 30–50 siswa SD + 5 guru |
| Durasi | 4–6 minggu pembelajaran |
| Desain | Pre-test → Treatment → Post-test |
| Instrumen pre/post-test | Motivation to Read Profile (MRP) + Rubrik fluensi membaca |
| Data tambahan | Observasi, wawancara guru, log penggunaan aplikasi |

### 5.4 Analisis Data
| Aktivitas | Metode |
|-----------|--------|
| Analisis validasi ahli | Statistik deskriptif (mean, %) |
| Analisis respons pengguna | Statistik deskriptif + kualitatif |
| Analisis pre-test vs post-test | Paired sample t-test (SPSS/R) |
| Analisis kualitatif | Reduksi data, coding, tema (Miles & Huberman) |

**Milestone Fase 5:** ✅ Data penelitian lengkap, produk final siap.

---

## FASE 6: FINALISASI & PUBLIKASI (Minggu 33–36)

### 6.1 Finalisasi Produk
| Aktivitas | Output |
|-----------|--------|
| Revisi akhir berdasarkan uji lapangan | Produk final |
| Dokumentasi teknis (README, API docs) | Dokumentasi lengkap |
| Pembuatan panduan penggunaan untuk guru | Buku panduan / video tutorial |
| Pembuatan panduan penggunaan untuk siswa | Panduan ringkas / infografis |
| Deploy ke production | Aplikasi live |

### 6.2 Penulisan Artikel Ilmiah
| Aktivitas | Output |
|-----------|--------|
| Penulisan draft artikel (format jurnal Sinta 2/3) | Draft artikel |
| Review internal & revisi | Artikel siap submit |
| Submission ke jurnal target | Bukti submission |
| Proses review & revisi (estimasi 2–4 bulan) | Artikel terbit |

### 6.3 Diseminasi
| Aktivitas | Output |
|-----------|--------|
| Presentasi hasil di seminar/konferensi nasional | Slide presentasi |
| Workshop penggunaan aplikasi untuk guru-guru SD | Materi workshop |
| Publikasi di repositori institusi | Link repositori |
| (Opsional) Pendaftaran HKI (Hak Kekayaan Intelektual) | Sertifikat HKI |

**Milestone Fase 6:** ✅ Aplikasi live, artikel tersubmit, diseminasi terlaksana.

---

## Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Keterbatasan perangkat di sekolah | Sedang | Tinggi | PWA + mode offline; gunakan perangkat guru sebagai fallback |
| Internet tidak stabil di sekolah | Tinggi | Sedang | Fitur offline-first; konten dapat di-cache |
| Guru kesulitan menggunakan authoring tool | Sedang | Tinggi | UI sederhana, template siap pakai, video tutorial, pelatihan |
| Siswa kelas rendah (1–2) belum lancar membaca | Tinggi | Sedang | Dukungan audio narasi guru; pendekatan bertahap |
| Kualitas mikrofon perangkat rendah | Sedang | Sedang | Noise reduction di sisi klien; panduan perekaman |
| Perubahan kebijakan kurikulum | Rendah | Sedang | Konten fleksibel, template dapat disesuaikan |
| Keterlambatan timeline | Sedang | Sedang | Buffer waktu di setiap fase; prioritasi fitur MVP |

---

## Checklist Kesiapan per Fase

### Checklist Masuk Fase 2 (Desain)
- [ ] Studi literatur selesai
- [ ] Data analisis kebutuhan terkumpul
- [ ] Proposal disetujui
- [ ] Instrumen penelitian tervalidasi
- [ ] Izin penelitian diperoleh

### Checklist Masuk Fase 3 (Pengembangan)
- [ ] Desain UI/UX final
- [ ] Arsitektur teknis disetujui
- [ ] Database schema final
- [ ] Repository & CI/CD siap
- [ ] Konten prototipe tersedia

### Checklist Masuk Fase 4 (Validasi)
- [ ] MVP fungsional & stabil
- [ ] Konten prototipe lengkap (min. 2 cerita)
- [ ] Validator ahli sudah dikonfirmasi
- [ ] Instrumen validasi siap distribusi

### Checklist Masuk Fase 5 (Uji Coba)
- [ ] Produk lolos validasi ahli (skor ≥ 3,5/5)
- [ ] Revisi berdasarkan masukan validator selesai
- [ ] Sekolah & siswa uji coba sudah dikonfirmasi
- [ ] Pre-test siap dilaksanakan

### Checklist Masuk Fase 6 (Finalisasi)
- [ ] Data uji coba terkumpul & dianalisis
- [ ] Revisi akhir produk selesai
- [ ] Hasil statistik signifikan (atau catatan jika tidak)
