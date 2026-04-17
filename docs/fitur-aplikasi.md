# Spesifikasi Fitur Aplikasi — Panel Gambar Bersuara

---

## Ringkasan Peran Pengguna

| Peran | Deskripsi | Akses Utama |
|-------|-----------|-------------|
| **Admin** | Mengelola sistem, pengguna, dan konten global | Semua fitur + panel admin |
| **Guru** | Membuat panel cerita, mengelola kelas, mengevaluasi siswa | Authoring tool, dashboard guru |
| **Siswa** | Membaca panel cerita, mendengarkan audio, merekam suara | Panel viewer, dashboard siswa |

---

## Modul 1: Autentikasi & Manajemen Pengguna

### F1.1 Registrasi & Login
- Login dengan email/password
- Login dengan Google (OAuth)
- Registrasi guru dengan kode verifikasi sekolah
- Registrasi siswa melalui kode kelas yang dibuat guru
- Lupa password (reset via email)

### F1.2 Profil Pengguna
- Edit nama, foto profil, dan informasi dasar
- Guru: informasi sekolah, kelas yang diajar
- Siswa: kelas, nama panggilan, avatar (pilihan karakter)

### F1.3 Manajemen Kelas (Guru)
- Buat kelas baru → generate kode kelas unik
- Lihat daftar siswa per kelas
- Undang siswa via kode kelas / link
- Hapus / arsipkan kelas

---

## Modul 2: Panel Viewer (Pembaca Cerita)

### F2.1 Daftar Cerita
- Galeri cerita panel yang tersedia (tampilan grid/list)
- Filter berdasarkan: kelas, tema, level kesulitan
- Pencarian judul cerita
- Indikator progres baca per cerita
- Label: Baru, Populer, Direkomendasikan Guru

### F2.2 Tampilan Panel Cerita
- Tampilan panel berurutan (horizontal scroll atau vertikal scroll)
- Mode tampilan: **Panel-by-Panel** (satu panel per layar) atau **Strip** (beberapa panel berurutan)
- Zoom in/out pada panel (pinch gesture di touch device)
- Navigasi: tombol Sebelumnya / Selanjutnya, swipe, atau tap area
- Indikator posisi panel (misal: Panel 3 dari 12)
- Mode layar penuh (*fullscreen*) untuk Smartboard/IFP

### F2.3 Dialog & Buble
- Tampilan buble/kotak dialog pada posisi yang ditentukan guru
- Animasi kemunculan dialog (fade-in, pop-up)
- Tap pada buble untuk memunculkan opsi:
  - 🔊 Dengarkan (putar audio dialog)
  - 🎤 Suarakan (rekam suara siswa membaca dialog)
  - 📖 Tampilkan teks (jika dialog awalnya tersembunyi)

### F2.4 Narasi
- Area narasi di bawah/atas panel (posisi configurable)
- Teks narasi dengan format sederhana (tebal, miring, berwarna)
- Opsi: dengarkan narasi (audio guru) atau baca sendiri
- *Highlight* teks saat audio narasi diputar (karaoke-style, opsional)

### F2.5 Audio Playback
- Pemutaran audio narasi guru per panel
- Pemutaran audio dialog per buble
- Suara latar (background music/SFX) per panel atau per cerita
- Kontrol: Play, Pause, Stop, volume, kecepatan putar
- Auto-play mode: putar semua audio secara berurutan
- Tombol mute / unmute

### F2.6 Perekaman Suara Siswa
- Tombol rekam pada setiap buble dialog / narasi
- Visualisasi gelombang suara (*waveform*) saat merekam
- Preview hasil rekaman sebelum menyimpan
- Opsi: rekam ulang atau simpan
- Rekaman tersimpan terkait dengan panel + siswa tertentu
- Indikator buble yang sudah direkam vs belum

### F2.7 Gambar Pendukung
- Gambar pendukung tambahan yang bisa di-tap untuk memperbesar
- Tooltip / keterangan gambar pendukung
- Galeri gambar pendukung per panel (jika lebih dari 1)

---

## Modul 3: Authoring Tool (Pembuat Cerita — Guru)

### F3.1 Manajemen Cerita
- Buat cerita baru (judul, deskripsi, kelas target, tema, level)
- Daftar cerita yang sudah dibuat (draft, terbit, arsip)
- Duplikat cerita (untuk membuat variasi)
- Hapus / arsipkan cerita
- Publikasikan ke kelas tertentu atau semua kelas

### F3.2 Editor Panel
- Tambah panel baru (urutan otomatis, bisa di-reorder)
- Upload gambar utama panel (dari file atau kamera)
- Crop, resize, dan rotate gambar
- Atur ukuran panel (rasio aspek: 4:3, 16:9, 1:1, custom)
- Atur warna latar panel
- Hapus / duplikat panel
- Drag & drop untuk mengubah urutan panel

### F3.3 Editor Buble/Kotak Dialog
- Tambah buble dialog di atas gambar panel
- Pilih bentuk buble: oval, kotak, awan pikiran, ledakan, custom
- Posisi buble: drag & drop di atas gambar
- Resize buble
- Input teks dialog (dengan format dasar)
- Assign buble ke karakter (nama + warna identitas)
- Upload / rekam audio untuk dialog
- Atur urutan kemunculan buble (animasi berurutan)

### F3.4 Editor Narasi
- Tambah area narasi per panel
- Editor teks rich-text sederhana (tebal, miring, warna, ukuran)
- Upload / rekam audio narasi guru
- Atur posisi narasi (atas, bawah, overlay)

### F3.5 Editor Audio
- Upload file audio (MP3, WAV, OGG, WebM)
- Rekam audio langsung dari browser (mikrofon)
- Trim audio sederhana (potong awal/akhir)
- Atur volume per audio track
- Assign audio sebagai: suara latar, narasi, dialog
- Preview audio sebelum menyimpan

### F3.6 Gambar Pendukung
- Tambah gambar pendukung per panel
- Upload dari file atau pilih dari pustaka gambar
- Atur posisi dan ukuran
- Tambah keterangan / caption

### F3.7 Template & Pustaka
- Pilih template cerita siap pakai (struktur panel sudah ada)
- Pustaka gambar bawaan (ilustrasi karakter, latar, objek)
- Pustaka audio bawaan (efek suara, musik latar)
- Simpan panel/cerita sendiri sebagai template

### F3.8 Preview
- Preview cerita sebagai siswa (tanpa harus publish)
- Preview di berbagai ukuran layar (mobile, tablet, desktop, IFP)
- Share preview link ke guru lain untuk review

---

## Modul 4: Dashboard Guru

### F4.1 Ringkasan Kelas
- Jumlah siswa per kelas
- Jumlah cerita yang di-assign ke kelas
- Statistik aktivitas: cerita yang dibaca, rekaman yang dibuat

### F4.2 Monitoring Progres Siswa
- Daftar siswa dan progres per cerita
- Status per siswa per cerita: Belum Dibaca, Sedang Dibaca, Selesai
- Jumlah buble yang sudah direkam vs total buble
- Waktu yang dihabiskan per cerita

### F4.3 Review Rekaman Siswa
- Daftar rekaman suara per siswa per cerita
- Putar rekaman siswa
- Berikan feedback (bintang 1–5 + komentar singkat)
- Tandai rekaman sebagai "Contoh Baik" (bisa dijadikan model)
- Bandingkan rekaman siswa dengan audio guru

### F4.4 Penugasan
- Assign cerita ke kelas / siswa tertentu
- Atur deadline (opsional)
- Buat catatan instruksi khusus per penugasan
- Notifikasi ke siswa saat ada penugasan baru

---

## Modul 5: Dashboard Siswa

### F5.1 Beranda Siswa
- Cerita yang ditugaskan (prioritas tampil)
- Cerita yang sedang dibaca (lanjutkan membaca)
- Cerita yang direkomendasikan
- Badge / penghargaan yang diperoleh

### F5.2 Koleksi Rekaman
- Daftar semua rekaman suara yang sudah dibuat
- Putar ulang rekaman sendiri
- Lihat feedback dari guru
- Hapus rekaman (dengan konfirmasi)

### F5.3 Pencapaian & Gamifikasi
- **Badge** untuk milestone: Pertama Kali Membaca, Perekam Rajin, Pembaca Cepat, dll.
- **Streak** harian: berapa hari berturut-turut membaca
- **Bintang** kumulatif dari feedback guru
- Leaderboard kelas (opsional, bisa diaktifkan/nonaktifkan guru)

---

## Modul 6: Panel Admin

### F6.1 Manajemen Pengguna
- CRUD guru dan siswa
- Reset password pengguna
- Aktivasi / nonaktivasi akun
- Statistik pengguna aktif

### F6.2 Manajemen Konten
- Review cerita yang dibuat guru sebelum dipublikasikan (opsional)
- Kelola pustaka gambar & audio bawaan
- Upload konten cerita dari tim konten pusat
- Moderasi konten (flag konten tidak sesuai)

### F6.3 Manajemen Sekolah
- Daftar sekolah yang terdaftar
- Konfigurasi per sekolah (logo, nama, setting)
- Statistik penggunaan per sekolah

### F6.4 Laporan & Analitik
- Jumlah cerita yang dibuat vs dibaca
- Jumlah rekaman yang dibuat
- Cerita paling populer
- Waktu rata-rata per cerita
- Tren penggunaan harian/mingguan/bulanan
- Export laporan (CSV/PDF)

---

## Modul 7: Fitur Lintas Modul

### F7.1 Responsivitas
- Layout adaptif dari layar 4" (smartphone) hingga 86" (IFP)
- Touch-optimized untuk tablet & Smartboard
- Keyboard navigable untuk PC/laptop

### F7.2 PWA & Offline
- Install sebagai aplikasi di home screen
- Cache konten cerita yang sudah diakses
- Download cerita untuk akses offline
- Sinkronisasi otomatis saat kembali online

### F7.3 Notifikasi
- Push notification (opsional): penugasan baru, feedback guru
- In-app notification
- Bisa dimatikan oleh pengguna

### F7.4 Lokalisasi
- Bahasa antarmuka: Bahasa Indonesia (utama)
- Potensi ekspansi: bahasa daerah, Bahasa Inggris

### F7.5 Aksesibilitas
- Ukuran font adjustable
- Mode kontras tinggi
- Screen reader support (ARIA)
- Navigasi keyboard
- Subtitel/transkrip audio (opsional, tahap lanjut)

---

## Prioritas Fitur (MoSCoW)

### Must Have (MVP)
- Login/register (guru & siswa)
- Panel viewer (tampilan cerita, dialog, narasi)
- Audio playback (narasi, dialog, suara latar)
- Perekaman suara siswa
- Authoring tool dasar (upload gambar, tambah dialog/narasi, audio)
- Dashboard guru (kelola cerita, lihat progres)
- Responsif (mobile + desktop)

### Should Have (v1.1)
- PWA & offline
- Template cerita
- Pustaka gambar/audio bawaan
- Feedback guru ke rekaman siswa
- Gamifikasi dasar (badge, streak)
- Preview multi-device

### Could Have (v1.2+)
- Kolaborasi real-time antar guru
- Karaoke-style text highlight
- Admin panel lengkap
- Analitik lanjutan
- Notifikasi push
- Leaderboard

### Won't Have (saat ini)
- AI-generated illustration
- Text-to-speech otomatis
- Speech-to-text / auto-grading
- Multiplayer / real-time classroom mode
- Bahasa daerah
