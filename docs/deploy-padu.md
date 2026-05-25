# Deploy Panel Gambar — padu.digsan.id

> **Target:** `https://padu.digsan.id`
> **Server:** Ubuntu 24.04 LTS · 2 vCPU · 4 GB RAM · 20 GB SSD
> **IP:** `103.55.37.232`
> **Stack:** Next.js 16 · Prisma v7 · PostgreSQL 16 (Docker) · PM2 · Nginx · Let's Encrypt

---

## Gambaran Arsitektur

```
Internet
  │
  ▼
padu.digsan.id  (DNS A → 103.55.37.232)
  │
  ▼
Nginx  :80/:443  (reverse proxy + SSL)
  │
  ▼
Next.js  :3000  (PM2)
  │
  ├── /api/*          → Prisma ORM
  └── /uploads/*      → static files (disk lokal)
        │
        ▼
PostgreSQL  :5432  (Docker container)
```

---

## Langkah 1 — Konfigurasi DNS

Tambahkan A record di panel DNS `digsan.id`:

```
Type : A
Name : padu
Value: 103.55.37.232
TTL  : 3600
```

Verifikasi propagasi (tunggu 5–10 menit):

```bash
nslookup padu.digsan.id
# Expected: Address: 103.55.37.232
```

---

## Langkah 2 — Akses Server & Setup User

SSH sebagai root pertama kali:

```bash
ssh root@103.55.37.232
```

Buat user deploy (non-root):

```bash
adduser digsanid
usermod -aG sudo digsanid

# Copy SSH key agar bisa SSH langsung
mkdir -p /home/digsanid/.ssh
cp /root/.ssh/authorized_keys /home/digsanid/.ssh/
chown -R digsanid:digsanid /home/digsanid/.ssh
chmod 700 /home/digsanid/.ssh
chmod 600 /home/digsanid/.ssh/authorized_keys
```

Login ulang sebagai `digsanid`:

```bash
ssh digsanid@103.55.37.232
```

> **Semua perintah selanjutnya dijalankan sebagai `digsanid`.**

---

## Langkah 3 — Update Sistem & Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v   # v20.x.x
npm -v    # 10.x.x

# PM2 (process manager)
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx || true   # abaikan error start awal

# Fix IPv6 — server Ubuntu ini tidak support IPv6, nginx gagal start tanpanya
sudo sed -i 's/listen \[::\]:80 default_server;//g' /etc/nginx/sites-enabled/default
sudo sed -i 's/listen \[::\]:80;//g' /etc/nginx/sites-enabled/default
sudo dpkg --configure -a
sudo nginx -t && sudo systemctl start nginx

# Git
sudo apt install -y git

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Docker (untuk PostgreSQL)
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker digsanid
newgrp docker
```

Verifikasi Docker:

```bash
docker --version   # Docker version 26.x.x
```

---

## Langkah 4 — Jalankan PostgreSQL via Docker

```bash
docker run -d \
  --name panel_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=GANTI_PASSWORD_KUAT \
  -e POSTGRES_DB=panel_gambar \
  -p 127.0.0.1:5432:5432 \
  -v panel_postgres_data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine
```

> **Penting:** Ganti `GANTI_PASSWORD_KUAT` dengan password yang aman.
> Port hanya di-bind ke `127.0.0.1` (tidak terbuka ke publik).

Verifikasi:

```bash
docker ps
# panel_postgres   postgres:16-alpine   Up ...   127.0.0.1:5432->5432/tcp
```

---

## Langkah 5 — Clone Repository & Install

> **Repo private** — gunakan SSH Deploy Key agar tidak perlu password.

```bash
# 1. Generate SSH key khusus untuk repo ini
ssh-keygen -t ed25519 -C "padu-edu-server" -f ~/.ssh/padu_deploy -N ""

# 2. Tampilkan public key — copy hasilnya
cat ~/.ssh/padu_deploy.pub

# 3. Tambahkan ke GitHub:
#    https://github.com/digsanid-26/padu-edu/settings/keys → Add deploy key
#    Paste public key di atas, Allow write access: TIDAK perlu

# 4. Konfigurasi SSH alias
cat >> ~/.ssh/config << 'EOF'
Host github-padu
    HostName github.com
    User git
    IdentityFile ~/.ssh/padu_deploy
EOF
chmod 600 ~/.ssh/config

# 5. Test koneksi (harus muncul: Hi digsanid-26! You've successfully authenticated...)
ssh -T github-padu
```

```bash
# 6. Clone via SSH alias (tanpa password)
cd ~
git clone github-padu:digsanid-26/padu-edu.git
cd padu-edu/app
npm install
```

---

## Langkah 6 — Konfigurasi Environment Variables

```bash
nano ~/padu-edu/app/.env
```

Isi dengan:

```env
# Database (PostgreSQL di Docker lokal)
DATABASE_URL="postgresql://postgres:Padu462!@localhost:5432/panel_gambar?schema=public"

# NextAuth v5
AUTH_SECRET="cGjtkx45uF/WtLBGNKFMHCu9Q3AzkI48Lw0pqZ0/HCQ="
NEXTAUTH_URL="https://padu.digsan.id"

# Google OAuth (isi jika pakai login Google, kosongkan jika tidak)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Salin output ke AUTH_SECRET di atas
```

Simpan: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## Langkah 7 — Setup Database Schema

Push schema Prisma ke PostgreSQL:

```bash
cd ~/padu-edu/app
npx prisma db push
```

Output yang diharapkan:
```
Your database is now in sync with your Prisma schema. Done in X.XXs
```

Seed data demo (opsional):

```bash
# Jalankan server sementara untuk seed, lalu hentikan
npm run build
# Seed via prisma langsung (setelah server jalan, POST /api/seed)
```

---

## Langkah 8 — Build Aplikasi

```bash
cd ~/padu-edu/app
npx prisma generate
npm run build
```

Pastikan output menampilkan `✓ Compiled successfully`.

---

## Langkah 9 — Konfigurasi PM2

Buat ecosystem config di root project:

```bash
nano ~/padu-edu/ecosystem.config.js
```

Isi:

```javascript
module.exports = {
  apps: [
    {
      name: "panel-gambar",
      cwd: "/home/digsanid/padu-edu/app",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        UMASK: "0022",
      },
      error_file: "/home/digsanid/.pm2/logs/padu-edu-error.log",
      out_file: "/home/digsanid/.pm2/logs/padu-edu-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
```

Jalankan:

```bash
cd ~/padu-edu
pm2 start ecosystem.config.js

# Verifikasi
pm2 status
pm2 logs panel-gambar --lines 20

# Tes lokal
curl http://localhost:3000
```

Set auto-start saat reboot:

```bash
pm2 startup
# Jalankan perintah sudo yang muncul di output
pm2 save
```

---

## Langkah 10 — Konfigurasi Nginx

Buat konfigurasi site:

```bash
sudo nano /etc/nginx/sites-available/padu.digsan.id
```

Isi:

```nginx
server {
    listen 80;
    server_name padu.digsan.id;

    # Upload file (gambar panel, audio, dll)
    client_max_body_size 50M;

    # Static uploads dari disk lokal
    location /uploads/ {
        alias /home/digsanid/padu-edu/app/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_cache_bypass $http_upgrade;

        # Timeout untuk WebRTC signaling polling
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

Aktifkan dan test:

```bash
sudo ln -s /etc/nginx/sites-available/padu.digsan.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Fix jika ada error IPv6:

```bash
sudo sed -i 's/listen \[::\]:80 default_server;//' /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Tes akses: `http://padu.digsan.id`

---

## Langkah 11 — Pasang SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d padu.digsan.id
```

Ikuti instruksi:
1. Masukkan email
2. Setuju Terms of Service → `Y`
3. Pilih redirect HTTP → HTTPS → `2`

Verifikasi auto-renewal:

```bash
sudo certbot renew --dry-run
```

Akses: `https://padu.digsan.id` ✅

---

## Langkah 12 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Langkah 13 — Seed Data Demo

Setelah aplikasi jalan, jalankan seed satu kali:

```bash
curl -X POST https://padu.digsan.id/api/seed
```

Akun demo yang dibuat:

| Role  | Email          | Password  |
|-------|----------------|-----------|
| Guru  | guru@demo.id   | demo1234  |
| Siswa | siswa@demo.id  | demo1234  |

> **Hapus atau amankan endpoint `/api/seed` setelah digunakan di production!**

---

## Script Deploy Otomatis

Buat script untuk update/redeploy:

```bash
nano ~/padu-edu/deploy.sh
```

Isi:

```bash
#!/bin/bash
set -e

APP_DIR="/home/digsanid/padu-edu"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
cd "$APP_DIR/app"
npm install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Pushing schema (jika ada perubahan)..."
npx prisma db push

echo "==> Building..."
npm run build

echo "==> Restarting PM2..."
pm2 reload panel-gambar --update-env || pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

echo ""
echo "✅ Deploy selesai! https://padu.digsan.id"
```

```bash
chmod +x ~/padu-edu/deploy.sh
```

Jalankan deploy:

```bash
ssh digsanid@103.55.37.232
~/padu-edu/deploy.sh
```
```bash
# Masuk ke container PostgreSQL
docker exec -it panel_postgres psql -U postgres -d panel_gambar

# Lihat daftar user
SELECT id, email, name, role FROM users;

# Ubah role user tertentu jadi admin (ganti email sesuai akun Anda)
UPDATE users SET role = 'admin' WHERE email = 'email-anda@contoh.com';

# Keluar
\q
---

## Monitoring & Logs

```bash
# Status aplikasi
pm2 status
pm2 monit

# Log real-time
pm2 logs panel-gambar

# Log Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status PostgreSQL Docker
docker ps
docker logs panel_postgres

# Disk usage
df -h
du -sh ~/padu-edu/app/public/uploads/
```

---

## Backup Database

Backup manual:

```bash
docker exec panel_postgres pg_dump -U postgres panel_gambar \
  > ~/backups/panel_gambar_$(date +%Y%m%d_%H%M%S).sql
```

Setup backup otomatis harian (cron):

```bash
mkdir -p ~/backups
crontab -e
```

Tambahkan:

```cron
0 2 * * * docker exec panel_postgres pg_dump -U postgres panel_gambar > /home/digsanid/backups/panel_gambar_$(date +\%Y\%m\%d).sql 2>&1
# Hapus backup lebih dari 7 hari
0 3 * * * find /home/digsanid/backups -name "*.sql" -mtime +7 -delete
```

---

## Troubleshooting

### 502 Bad Gateway

```bash
pm2 status
pm2 restart panel-gambar
pm2 logs panel-gambar --lines 50
```

### Aplikasi crash (Out of Memory)

Edit `ecosystem.config.js`, naikkan `max_memory_restart` atau kurangi load. Dengan RAM 4GB, Next.js build butuh ~1.5GB sehingga pastikan tidak ada proses berat lain.

### Database tidak bisa connect

```bash
# Cek container jalan
docker ps | grep panel_postgres

# Restart jika mati
docker start panel_postgres

# Cek koneksi dari host
docker exec panel_postgres psql -U postgres -d panel_gambar -c "\dt"
```

### Upload file gagal

```bash
# Pastikan folder uploads ada dan writable
mkdir -p ~/padu-edu/app/public/uploads
chmod 755 ~/padu-edu/app/public/uploads
```

### SSL gagal renew

```bash
sudo ufw allow 80
sudo systemctl stop nginx
sudo certbot renew
sudo systemctl start nginx
```

---

## Estimasi Resource Usage

| Komponen | RAM | CPU |
|---|---|---|
| Next.js (PM2) | ~300–500 MB | rendah saat idle |
| PostgreSQL (Docker) | ~100–200 MB | rendah |
| Nginx | ~10 MB | sangat rendah |
| **Total** | **~500–800 MB** | aman di 4 GB |

> Server 2 vCPU / 4 GB RAM cukup untuk **±100 pengguna concurrent**.

---

## Multi-Domain — Akses dari Beberapa Domain

Aplikasi ini sudah siap multi-domain karena:
- `trustHost: true` sudah diset di `auth.config.ts` → NextAuth menerima request dari domain manapun
- `NEXTAUTH_URL` tidak perlu diisi (atau bisa dihapus dari `.env`)

Satu instance Next.js (port 3000) melayani semua domain sekaligus. Nginx yang menjadi pintu masuk per domain.

### Gambaran Arsitektur

```
padu.digsan.id  ──┐
padu.sekolah.id ──┤─→ Nginx :443 ──→ Next.js :3000 ──→ PostgreSQL
custom.domain   ──┘
```

---

### Langkah 1 — Arahkan DNS setiap domain ke IP server

Di panel DNS masing-masing domain, tambahkan A record:

```
Type : A
Name : @  (atau subdomain yang diinginkan, misal: padu)
Value: 103.55.37.232
TTL  : 3600
```

Verifikasi:

```bash
nslookup domain-baru.com
# Expected: Address: 103.55.37.232
```

---

### Langkah 2 — Tambah domain ke konfigurasi Nginx

**Cara A — Gabung di file yang sudah ada (paling mudah)**

Edit file Nginx yang sudah ada:

```bash
sudo nano /etc/nginx/sites-available/padu.digsan.id
```

Tambahkan domain baru di `server_name`:

```nginx
server {
    listen 80;
    server_name padu.digsan.id padu.sekolah.id custom.domain.com;
    # ... sisa konfigurasi tetap sama ...
}
```

Setelah certbot dijalankan, blok HTTPS juga perlu diupdate dengan domain baru (lihat Langkah 3).

---

**Cara B — File terpisah per domain (jika perlu konfigurasi berbeda)**

```bash
sudo nano /etc/nginx/sites-available/custom.domain.com
```

Isi (sama persis dengan `padu.digsan.id`, ganti `server_name`):

```nginx
server {
    listen 80;
    server_name custom.domain.com;

    client_max_body_size 50M;

    location /uploads/ {
        alias /home/digsanid/padu-edu/app/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/custom.domain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Langkah 3 — Pasang SSL untuk semua domain sekaligus

**Cara A** (jika semua domain di satu file Nginx):

```bash
sudo certbot --nginx -d padu.digsan.id -d padu.sekolah.id -d custom.domain.com
```

> Certbot akan otomatis update blok HTTPS di file konfigurasi Nginx yang sama.

**Cara B** (file terpisah per domain):

```bash
# Jalankan certbot satu per domain
sudo certbot --nginx -d custom.domain.com
```

Verifikasi:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certificates   # lihat semua sertifikat aktif
```

---

### Langkah 4 — Update `.env` (opsional)

Karena `trustHost: true` sudah aktif, tidak perlu ubah `NEXTAUTH_URL`. Tapi jika ingin email/callback NextAuth menggunakan domain tertentu sebagai primary:

```bash
nano ~/padu-edu/app/.env
```

```env
# Biarkan kosong atau gunakan domain utama
# NEXTAUTH_URL tidak dibutuhkan jika trustHost=true
NEXTAUTH_URL=https://padu.digsan.id
```

---

### Langkah 5 — Google OAuth (jika menggunakan login Google)

Di [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → OAuth 2.0 Client**:

Tambahkan setiap domain baru di:

**Authorized JavaScript origins:**
```
https://padu.digsan.id
https://padu.sekolah.id
https://custom.domain.com
```

**Authorized redirect URIs:**
```
https://padu.digsan.id/api/auth/callback/google
https://padu.sekolah.id/api/auth/callback/google
https://custom.domain.com/api/auth/callback/google
```

---

### Verifikasi Akhir

```bash
# Cek semua domain bisa diakses
curl -I https://padu.digsan.id
curl -I https://custom.domain.com

# Cek SSL valid
echo | openssl s_client -connect custom.domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Cek Nginx config bersih
sudo nginx -t
```

---

### Catatan Penting

| Hal | Keterangan |
|---|---|
| **Satu database** | Semua domain berbagi database yang sama — user dan data adalah global |
| **Satu instance app** | Tidak ada isolasi antar domain; semua mengakses konten yang sama |
| **Upload files** | URL file upload menggunakan `Host` header dari request — link akan menggunakan domain yang sedang diakses |
| **Session cookie** | Cookie login bersifat per-domain (tidak bisa SSO antar domain berbeda) |
| **Wildcard SSL** | Untuk subdomain tak terbatas (misal `*.digsan.id`), gunakan `certbot --manual --preferred-challenges dns -d *.digsan.id` |

---

## Panduan Update Aplikasi

Panduan ini digunakan setiap kali ada perubahan kode (fitur baru, perbaikan bug, perubahan schema database) yang perlu di-deploy ke server produksi.

---

### Update Cepat (Cara Normal)

Skenario paling umum: push kode dari lokal, lalu jalankan deploy di server.

**1. Push dari lokal ke GitHub:**

```bash
# Di komputer lokal (PowerShell / terminal)
cd C:\Users\MANAKreatif\CascadeProjects\panel-gambar\app
git add -A
git commit -m "feat: deskripsi perubahan"
git push padu main
```

**2. Jalankan deploy di server:**

```bash
ssh digsanid@103.55.37.232
~/padu-edu/deploy.sh
```

Script otomatis menjalankan: `git pull` → `npm install` → `prisma generate` → `prisma db push` → `npm run build` → `pm2 reload`.

**3. Verifikasi:**

```bash
pm2 status
pm2 logs panel-gambar --lines 30
curl -I https://padu.digsan.id
```

---

### Update dengan Perubahan Schema Database

Jika ada perubahan pada `prisma/schema.prisma` (tambah tabel, kolom baru, dll), `deploy.sh` sudah menjalankan `prisma db push` secara otomatis. Namun perlu diperhatikan:

```bash
# Sebelum push, cek terlebih dahulu apa yang akan berubah di schema
# (jalankan di lokal bila db lokal tersedia)
npx prisma db push --preview-feature

# Di server, bila ingin melihat diff schema sebelum apply:
ssh digsanid@103.55.37.232
cd ~/padu-edu/app
git pull origin main
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

> ⚠️ **Hati-hati** dengan perubahan yang bersifat **destructive** (hapus kolom, rename tabel). `prisma db push` akan menolak jika ada risiko data hilang — gunakan flag `--accept-data-loss` hanya jika benar-benar yakin.

```bash
# Paksa push schema meski ada data loss (gunakan dengan sangat hati-hati!)
cd ~/padu-edu/app
npx prisma db push --accept-data-loss
```

---

### Update File `.env` di Server

Jika ada variabel lingkungan baru (API key, konfigurasi baru):

```bash
ssh digsanid@103.55.37.232
nano ~/padu-edu/app/.env
```

Setelah simpan, restart PM2 agar `.env` baru dibaca:

```bash
pm2 reload panel-gambar --update-env
pm2 save
```

Untuk menambah domain baru ke `NEXTAUTH_URL` atau konfigurasi multi-domain, lihat section **Menambah Domain Baru** di atas.

---

### Rollback ke Versi Sebelumnya

Jika deploy terbaru bermasalah dan perlu kembali ke commit sebelumnya:

```bash
ssh digsanid@103.55.37.232
cd ~/padu-edu/app

# Lihat daftar commit terakhir
git log --oneline -10

# Kembali ke commit tertentu (ganti <hash> dengan SHA commit)
git checkout <hash>

# Rebuild dan restart
cd ~/padu-edu/app
npm install
npx prisma generate
npm run build
pm2 reload panel-gambar --update-env

# Setelah stabil, kembali ke main
git checkout main
```

> **Catatan:** Rollback schema database lebih kompleks. Jika schema sudah berubah, rollback kode saja mungkin tidak cukup — pertimbangkan untuk memperbaiki bug di commit baru daripada rollback.

---

### Memeriksa Log & Status Setelah Update

```bash
# Status semua proses PM2
pm2 status

# Log real-time (Ctrl+C untuk keluar)
pm2 logs panel-gambar

# Log 50 baris terakhir
pm2 logs panel-gambar --lines 50

# Log error saja
pm2 logs panel-gambar --err --lines 50

# Restart manual jika app crash
pm2 restart panel-gambar

# Reload tanpa downtime (zero-downtime restart)
pm2 reload panel-gambar --update-env
```

---

### Memperbarui Script `deploy.sh`

Jika perlu memodifikasi script deploy itu sendiri:

```bash
ssh digsanid@103.55.37.232
nano ~/padu-edu/deploy.sh
```

Template deploy.sh terkini (referensi):

```bash
#!/bin/bash
set -e

APP_DIR="/home/digsanid/padu-edu"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
cd "$APP_DIR/app"
npm install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Pushing schema (jika ada perubahan)..."
npx prisma db push

echo "==> Building..."
npm run build

echo "==> Restarting PM2..."
pm2 reload panel-gambar --update-env || pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

echo ""
echo "✅ Deploy selesai! https://padu.digsan.id"
```

---

### Pembaruan Dependensi (npm packages)

Untuk memperbarui paket npm ke versi terbaru yang kompatibel:

```bash
ssh digsanid@103.55.37.232
cd ~/padu-edu/app

# Lihat paket yang outdated
npm outdated

# Update semua ke versi terbaru yang sesuai semver di package.json
npm update

# Update paket tertentu ke versi terbaru
npm install next@latest react@latest react-dom@latest

# Rebuild setelah update
npm run build
pm2 reload panel-gambar --update-env
```

> Selalu test di lokal dulu sebelum update dependensi besar di server produksi.

---

### Pembaruan SSL Certificate

Sertifikat Let's Encrypt berlaku 90 hari. Certbot biasanya sudah terdaftar sebagai cron job otomatis. Untuk cek dan renew manual:

```bash
# Cek tanggal expire semua sertifikat
sudo certbot certificates

# Renew manual semua sertifikat yang mendekati expire
sudo certbot renew

# Renew sertifikat domain tertentu
sudo certbot renew --cert-name padu.digsan.id

# Reload Nginx setelah renew
sudo nginx -t && sudo systemctl reload nginx
```

Verifikasi cron auto-renew aktif:

```bash
sudo systemctl status certbot.timer
# atau
sudo crontab -l | grep certbot
```

---

### Checklist Update Rutin

Gunakan checklist ini setiap kali melakukan update:

- [ ] Kode sudah ditest di lokal dan tidak ada error build (`npm run build`)
- [ ] `git push` ke GitHub berhasil
- [ ] `~/padu-edu/deploy.sh` dijalankan di server tanpa error
- [ ] `pm2 status` menunjukkan `online` (bukan `errored`)
- [ ] Buka `https://padu.digsan.id` di browser — halaman tampil normal
- [ ] Cek fitur utama: login, buka cerita, live session
- [ ] Jika ada perubahan schema: verifikasi data lama tidak hilang
- [ ] Jika ada `.env` baru: `pm2 reload --update-env` sudah dijalankan
