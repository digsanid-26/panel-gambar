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
