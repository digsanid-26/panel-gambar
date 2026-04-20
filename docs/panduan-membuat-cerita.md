# Panduan Membuat Cerita — Panel Gambar Bersuara

> Panduan lengkap untuk guru dalam membuat cerita interaktif dari awal hingga siap dipublikasikan.

---

## Daftar Isi

1. [Persiapan Sebelum Membuat Cerita](#1-persiapan-sebelum-membuat-cerita)
2. [Membuat Cerita Baru](#2-membuat-cerita-baru)
3. [Mengenal Halaman Editor Cerita](#3-mengenal-halaman-editor-cerita)
4. [Mengatur Detail Cerita (Metadata)](#4-mengatur-detail-cerita-metadata)
5. [Menambahkan Karakter](#5-menambahkan-karakter)
6. [Membuat Panel](#6-membuat-panel)
7. [Mengelola Dialog](#7-mengelola-dialog)
8. [Menambahkan Audio (Narasi & Suara Latar)](#8-menambahkan-audio-narasi--suara-latar)
9. [Mengatur Timeline Panel](#9-mengatur-timeline-panel)
10. [Mempublikasikan Cerita](#10-mempublikasikan-cerita)
11. [Mengelola Cerita yang Sudah Dibuat](#11-mengelola-cerita-yang-sudah-dibuat)
12. [Tips & Praktik Terbaik](#12-tips--praktik-terbaik)

---

## 1. Persiapan Sebelum Membuat Cerita

Sebelum mulai, siapkan bahan-bahan berikut:

### Bahan yang Perlu Disiapkan

| Bahan | Keterangan | Format |
|-------|-----------|--------|
| **Naskah cerita** | Teks narasi dan dialog per panel | Teks biasa |
| **Gambar panel** | Ilustrasi per panel/adegan | JPG, PNG (maks 10 MB) |
| **Cover cerita** | Gambar sampul cerita | JPG, PNG |
| **Audio narasi** *(opsional)* | Rekaman suara narrator | MP3, WAV, WebM |
| **Audio dialog** *(opsional)* | Rekaman suara per karakter | MP3, WAV, WebM |
| **Suara latar** *(opsional)* | Musik atau efek suara latar | MP3, WAV, WebM |
| **Video trailer** *(opsional)* | Video pengantar cerita | MP4 |

### Perencanaan Cerita

Buatlah kerangka sederhana:

1. **Judul** — Nama cerita yang menarik
2. **Deskripsi** — Sinopsis 1-2 kalimat
3. **Tema** — Misal: Kehidupan Sehari-hari, Hewan & Alam, Cerita Rakyat, dll.
4. **Level** — Sesuaikan dengan kemampuan siswa (Pemula/Dasar/Menengah/Mahir)
5. **Target Kelas** — Kelas berapa cerita ini ditujukan
6. **Daftar Karakter** — Nama, gender, warna, deskripsi singkat
7. **Urutan Panel** — Rencana adegan per panel (gambar + narasi + dialog)

---

## 2. Membuat Cerita Baru

### Langkah-langkah:

1. Login sebagai **Guru** di https://panel-edu.digsan.id/login
2. Buka **Dashboard** → klik tombol **"Buat Cerita Baru"** atau langsung ke `/stories/create`
3. Isi formulir berikut:

   - **Cover Cerita** — Upload gambar sampul (klik area upload)
   - **Judul Cerita** — Contoh: "Kelinci yang Rajin"
   - **Deskripsi Singkat** — Ceritakan tentang apa cerita ini
   - **Video Trailer** *(opsional)* — Upload video pengantar
   - **Tema** — Pilih dari dropdown (misal: Hewan & Alam)
   - **Level** — Pilih tingkat kesulitan
   - **Target Kelas** — Pilih kelas sasaran

4. Klik **"Buat & Lanjut Edit Panel"**
5. Anda akan diarahkan ke halaman **Editor Cerita**

---

## 3. Mengenal Halaman Editor Cerita

Halaman editor terdiri dari beberapa bagian utama:

```
┌─────────────────────────────────────────┐
│  ← Kembali    [Judul Cerita]    [Terbitkan] │
├─────────────────────────────────────────┤
│  📋 Metadata Cerita (bisa di-expand)     │
│  👤 Pengenalan Karakter                  │
│  📁 Element Manager                      │
├─────────────────────────────────────────┤
│  Panel 1 ─ [▲] [▼] [🗑]                │
│  ├── Gambar Panel                        │
│  ├── Teks Narasi                         │
│  ├── Audio Narasi (rekam/upload)         │
│  ├── Suara Latar (rekam/upload)          │
│  ├── Dialog-dialog                       │
│  └── Timeline Panel                      │
├─────────────────────────────────────────┤
│  Panel 2 ─ ...                           │
├─────────────────────────────────────────┤
│  [+ Tambah Panel Simpel]                 │
│  [+ Tambah Panel Canvas]                 │
└─────────────────────────────────────────┘
```

---

## 4. Mengatur Detail Cerita (Metadata)

Di bagian atas editor, klik **"Metadata & Pengaturan"** untuk membuka/menutup panel pengaturan:

- **Cover Cerita** — Ganti cover dengan upload gambar baru
- **Judul** — Edit judul cerita
- **Deskripsi** — Edit sinopsis
- **Video Trailer** — Upload/ganti video trailer
- **Tema, Level, Target Kelas** — Ubah dari dropdown
- **Mode Tampilan** — Pilih cara cerita ditampilkan:
  - `slide` — Tampilan slide per panel (navigasi tombol)
  - `scroll` — Tampilan scroll vertikal (gulir ke bawah)
- **Mode Rekaman** — Cara siswa merekam suara:
  - `manual` — Siswa merekam sendiri per dialog
  - `auto` — Sistem otomatis meminta rekaman

---

## 5. Menambahkan Karakter

Bagian **"Pengenalan Karakter"** digunakan untuk mendaftarkan karakter dalam cerita.

### Cara Menambah Karakter:

1. Klik **"Tambah Karakter"**
2. Isi detail karakter:
   - **Nama** — Contoh: "Budi"
   - **Gender** — Laki-laki / Perempuan / Lainnya
   - **Warna** — Pilih warna karakter (untuk bubble dialog)
   - **Avatar** *(opsional)* — Upload foto/gambar karakter
   - **Deskripsi** *(opsional)* — "Anak laki-laki kelas 3 yang rajin"
   - **Diperankan Oleh** *(opsional)* — Pilih siswa yang akan memerankan karakter ini
3. Klik **"Tambah"**

### Mengedit / Menghapus Karakter:

- Hover pada karakter → klik ikon **✏️ Edit** atau **🗑 Hapus**

> **Tips:** Daftarkan semua karakter terlebih dahulu sebelum membuat dialog, agar nama dan warna karakter konsisten di setiap panel.

---

## 6. Membuat Panel

Panel adalah satu "halaman" atau "adegan" dalam cerita. Setiap panel memiliki gambar, narasi, dialog, dan audio.

### Menambah Panel:

1. Scroll ke bawah halaman editor
2. Klik **"+ Tambah Panel Simpel"** (untuk panel dengan gambar upload)
   - Atau klik **"+ Tambah Panel Canvas"** (untuk panel dengan editor gambar canvas)
3. Panel baru akan muncul dan otomatis terbuka

### Mengisi Panel:

Klik panel untuk membuka/menutup detail. Isi bagian-bagian berikut:

#### a. Gambar Panel
- Klik area **"Klik atau drop gambar panel"**
- Pilih file gambar dari komputer
- Gambar akan ditampilkan sebagai latar panel

#### b. Warna Latar *(jika tidak ada gambar)*
- Gunakan color picker untuk memilih warna latar belakang

#### c. Teks Narasi
- Ketik teks narasi di kolom **"Teks narasi panel ini..."**
- Narasi akan tampil sebagai overlay di atas gambar panel
- Posisi, warna, dan ukuran teks bisa diatur di **editor panel visual**

#### d. Mengatur Posisi Teks Narasi
- Di area preview panel, teks narasi bisa di-**drag** (seret) ke posisi yang diinginkan
- Klik ikon **"T"** (Type) untuk mengatur:
  - **Warna teks** dan **warna latar**
  - **Opacity** (tingkat transparansi)
  - **Ukuran font** dan **lebar maksimum**

### Mengatur Urutan Panel:

- Gunakan tombol **▲ (naik)** dan **▼ (turun)** di sebelah kanan judul panel
- Panel akan bertukar posisi dengan panel di atas/bawahnya

### Menghapus Panel:

- Klik tombol **🗑 Hapus** → konfirmasi penghapusan

---

## 7. Mengelola Dialog

Dialog adalah percakapan antar karakter dalam satu panel.

### Menambah Dialog:

1. Buka panel yang ingin ditambah dialog
2. Klik **"+ Tambah Dialog"**
3. Isi formulir dialog:
   - **Nama Karakter** — Nama yang berbicara
   - **Warna** — Warna bubble dialog (sebaiknya sesuai karakter)
   - **Teks Dialog** — Isi percakapan
   - **Gaya Bubble** — Pilih bentuk balon bicara:
     - `Kotak` — Persegi panjang (default)
     - `Oval` — Bulat lonjong
     - `Awan` — Bentuk awan (pikiran)
     - `Ledakan` — Bentuk ledakan (teriakan)
   - **Posisi X & Y** — Koordinat bubble di panel (0-100%)
4. Klik **"Simpan"**

### Mengatur Posisi Bubble Dialog:

- Di **editor panel visual**, bubble dialog bisa di-**drag** ke posisi yang diinginkan
- Posisi akan otomatis tersimpan

### Merekam / Upload Audio Dialog:

Setiap dialog bisa memiliki audio suara karakter:

- **Rekam** — Klik ikon 🎤 **Mic** di samping dialog → rekam suara → simpan
- **Upload File** — Klik ikon 📁 **Upload** di samping dialog → pilih file audio

### Mengatur Urutan Dialog:

- Gunakan tombol **▲ (naik)** dan **▼ (turun)** di samping dialog
- Urutan dialog akan berubah di daftar (urutan di timeline bisa diatur terpisah)

### Menghapus Dialog:

- Klik tombol **🗑 Hapus** di samping dialog → konfirmasi

---

## 8. Menambahkan Audio (Narasi & Suara Latar)

### Audio Narasi

Audio narasi adalah suara narator yang membacakan teks narasi panel.

**Cara menambahkan:**

1. Buka panel yang ingin ditambah narasi
2. Pilih salah satu metode:
   - **Rekam** — Klik **"Rekam"** di bagian Audio Narasi → mulai rekam → stop → simpan
   - **Upload File** — Klik **"Upload Audio"** di bagian Audio Narasi → pilih file MP3/WAV

> Setelah upload, audio akan otomatis muncul di timeline panel dengan durasi yang sesuai.

### Suara Latar (Background Audio)

Suara latar adalah musik atau efek suara yang bermain di belakang selama panel ditampilkan.

**Cara menambahkan:**

1. Buka panel yang ingin ditambah suara latar
2. Pilih salah satu metode:
   - **Rekam** — Klik **"Rekam"** di bagian Suara Latar
   - **Upload File** — Klik **"Upload Audio"** di bagian Suara Latar

---

## 9. Mengatur Timeline Panel

Timeline panel adalah fitur untuk mengatur **kapan** setiap elemen muncul dan berapa lama ditampilkan dalam satu panel.

### Elemen dalam Timeline:

| Elemen | Warna | Keterangan |
|--------|-------|-----------|
| **Durasi Panel** | Biru | Total durasi panel ditampilkan |
| **Audio Narasi** | Hijau | Kapan narasi mulai/selesai |
| **Suara Latar** | Teal | Kapan musik latar mulai/selesai |
| **Dialog** | Kuning/Warna karakter | Kapan dialog muncul |
| **Bubble** | Ungu | Track tambahan untuk bubble teks |

### Cara Mengatur Timeline:

1. Scroll ke bagian **"Timeline Panel"** di dalam panel
2. Setiap elemen ditampilkan sebagai **bar horizontal** pada timeline

#### Menggeser Elemen:
- **Klik & drag** bar elemen ke kiri/kanan untuk mengubah waktu mulai

#### Mengubah Durasi:
- **Tarik tepi kiri/kanan** bar elemen untuk memperpanjang/memperpendek durasi

#### Kontrol Timeline:
- **Zoom** — Gunakan slider atau tombol 🔍+/🔍- untuk memperbesar/memperkecil
- **Muat Semua** — Klik tombol ⬜ untuk memuat semua elemen dalam area tampilan
- **Play Preview** — Klik ▶️ untuk preview pemutaran panel (audio akan ikut bermain)
- **Stop** — Klik ⏹ untuk menghentikan preview
- **+ Bubble** — Tambah track bubble baru
- **Reset** — Kembalikan timeline ke pengaturan default

#### Tips Timeline:
- Audio yang diupload akan **otomatis terdeteksi durasinya**
- Durasi panel akan otomatis diperpanjang jika ada elemen yang melebihi batas
- Klik elemen untuk melihat detail (waktu mulai, durasi, total)
- Klik 🗑 untuk menghapus elemen dari timeline

---

## 10. Mempublikasikan Cerita

Setelah semua panel selesai, cerita siap dipublikasikan.

### Langkah Publish:

1. Pastikan semua panel sudah memiliki:
   - ✅ Gambar panel
   - ✅ Teks narasi (minimal)
   - ✅ Audio narasi *(disarankan)*
   - ✅ Dialog dengan audio *(jika ada karakter)*
   - ✅ Timeline sudah diatur

2. Klik tombol **"Terbitkan"** di pojok kanan atas editor
3. Konfirmasi → cerita berubah status menjadi **Published**

> Cerita yang sudah dipublikasikan akan muncul di halaman **Cerita** (`/stories`) dan bisa dibaca oleh siswa.

### Mengubah Status Cerita:

Di halaman `/stories`, klik ikon **⋮** (tiga titik) pada kartu cerita:
- **Publish** — Publikasikan cerita (dari draft)
- **Unpublish (Draft)** — Tarik kembali cerita ke draft
- **Jadikan Publik** — Cerita bisa dilihat semua orang
- **Jadikan Privat** — Cerita hanya bisa dilihat oleh pembuat

---

## 11. Mengelola Cerita yang Sudah Dibuat

Di halaman **Cerita** (`/stories`), setiap kartu cerita memiliki menu aksi (**⋮**):

| Aksi | Keterangan |
|------|-----------|
| **Edit Cerita** | Buka editor untuk mengedit panel dan konten |
| **Publish / Unpublish** | Ubah status publikasi cerita |
| **Jadikan Publik / Privat** | Atur visibilitas cerita |
| **Hapus Cerita** | Hapus cerita beserta semua panel, dialog, dan rekaman |

### Hak Akses:

| Role | Hak Akses |
|------|-----------|
| **Guru** | Kelola cerita milik sendiri |
| **Admin** | Kelola semua cerita (termasuk milik guru lain) |
| **Siswa** | Hanya bisa membaca dan merekam suara |

---

## 12. Tips & Praktik Terbaik

### Konten
- ✅ Gunakan kalimat **pendek dan sederhana** sesuai level siswa
- ✅ Satu panel = satu adegan/momen cerita
- ✅ Narasi tidak lebih dari **2-3 kalimat** per panel
- ✅ Dialog singkat dan natural, sesuai karakter anak

### Visual
- ✅ Gambar panel beresolusi baik tapi ukuran file wajar (< 5 MB)
- ✅ Cover cerita yang menarik untuk ditampilkan di daftar cerita
- ✅ Posisikan bubble dialog agar tidak menutupi bagian penting gambar
- ✅ Gunakan warna karakter yang berbeda agar mudah dibedakan

### Audio
- ✅ Rekam narasi dengan suara yang jelas dan tempo lambat
- ✅ Pastikan ukuran file audio < 10 MB
- ✅ Atur durasi audio di timeline agar sinkron dengan tampilan
- ✅ Gunakan suara latar yang tidak terlalu keras

### Timeline
- ✅ Narasi dimulai **0.5 detik** setelah panel muncul (beri jeda)
- ✅ Dialog muncul **berurutan**, tidak bersamaan
- ✅ Gunakan **Play Preview** untuk mengecek sinkronisasi
- ✅ Perpanjang durasi panel jika audio belum selesai

### Alur Kerja yang Disarankan

```
1. Buat cerita baru → isi metadata dasar
2. Tambahkan semua karakter
3. Buat panel satu per satu:
   a. Upload gambar
   b. Tulis narasi
   c. Tambah dialog-dialog
   d. Rekam/upload audio narasi
   e. Rekam/upload audio dialog
   f. Atur timeline
   g. Preview → perbaiki jika perlu
4. Review keseluruhan
5. Publish cerita
```

---

## Ringkasan Cepat

```
Login Guru → Dashboard → Buat Cerita Baru
  → Isi judul, deskripsi, tema, level, target kelas
  → Upload cover
  → Klik "Buat & Lanjut Edit Panel"

Di Editor:
  → Tambah karakter
  → Tambah panel → upload gambar → tulis narasi
  → Tambah dialog → rekam/upload audio
  → Atur timeline → preview
  → Ulangi untuk panel berikutnya
  → Terbitkan cerita ✅
```

---

*Dokumen ini dapat digunakan sebagai referensi untuk membuat materi presentasi menggunakan Gamma AI, Canva, atau tools presentasi lainnya.*
