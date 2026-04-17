# Deploy Panel Gambar Bersuara di IDCloudHost VM

> **Target:** `https://panel-edu.digsan.id`
> **Platform:** IDCloudHost Virtual Machine (Console)
> **OS:** Ubuntu 22.04 / 24.04 LTS
> **Stack:** Node.js 20+, PM2, Nginx, Let's Encrypt SSL

---

## Prasyarat

| Komponen | Keterangan |
|----------|------------|
| **VM IDCloudHost** | Minimal 1 vCPU, 1 GB RAM, 20 GB SSD |
| **OS** | Ubuntu 22.04 atau 24.04 LTS |
| **Domain** | `digsan.id` sudah terdaftar dan bisa dikelola DNS-nya |
| **Subdomain** | `panel-edu.digsan.id` → pointing ke IP VM |
| **Supabase** | Project Supabase sudah aktif (URL + Keys) |

---

## Langkah 1 — Konfigurasi DNS

Masuk ke **panel DNS** domain `digsan.id` (di registrar atau IDCloudHost DNS Manager), tambahkan:

```
Type: A
Name: panel-edu
Value: 103.55.37.188
TTL: 3600
```

Verifikasi propagasi:

```bash
ping panel-edu.digsan.id
# atau
nslookup panel-edu.digsan.id
```

---

## Langkah 2 — Akses VM via Console / SSH

Melalui **IDCloudHost Console** atau SSH (login sebagai root terlebih dahulu):

```bash
ssh root@103.55.37.188
```

---

## Langkah 2.5 — Setup User `digsanid` (Non-Root)

> **Penting:** Sebaiknya jangan deploy menggunakan user root. Gunakan user `digsanid` yang sudah ada di VM.

Masih sebagai **root**, jalankan:

```bash
# Set password untuk user digsanid
passwd digsanid

# Tambahkan ke grup sudo
usermod -aG sudo digsanid

# Copy SSH key agar bisa SSH langsung sebagai digsanid
mkdir -p /home/digsanid/.ssh
cp /root/.ssh/authorized_keys /home/digsanid/.ssh/
chown -R digsanid:digsanid /home/digsanid/.ssh
chmod 700 /home/digsanid/.ssh
chmod 600 /home/digsanid/.ssh/authorized_keys
```

Sekarang **switch ke user digsanid** (atau logout dan SSH ulang):

```bash
# Cara 1: Switch langsung
su - digsanid

# Cara 2: SSH ulang (setelah logout)
ssh digsanid@103.55.37.188
```

Verifikasi:

```bash
whoami        # digsanid
sudo whoami   # root (konfirmasi sudo berfungsi)
```

> **Semua langkah selanjutnya dijalankan sebagai user `digsanid` dengan `sudo`.**

---

## Langkah 3 — Update Sistem & Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v    # v20.x.x
npm -v     # 10.x.x

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### Fix Nginx IPv6 Error

Jika VM tidak mendukung IPv6, Nginx akan gagal start dengan error:
`socket() [::]:80 failed (97: Address family not supported by protocol)`

Fix:

```bash
sudo sed -i 's/listen \[::\]:80/# listen [::]:80/' /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl start nginx
```

---

## Langkah 4 — Clone Repository & Setup Aplikasi

```bash
cd ~
git clone https://github.com/digsanid-26/panel-gambar.git
cd panel-gambar/app

# Install dependencies
npm install
```

---

## Langkah 5 — Konfigurasi Environment Variables

```bash
cp .env.local.example .env.local
nano .env.local
```

> **Catatan:** Path aplikasi sekarang di `/home/digsanid/panel-gambar/app`

Isi dengan kredensial Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **Penting:** Ganti placeholder di atas dengan kredensial asli dari [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API.

Simpan: `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## Langkah 6 — Build Aplikasi

```bash
cd ~/panel-gambar/app
npm run build
```

Pastikan build berhasil tanpa error. Output `standalone` atau `.next` akan muncul.

---

## Langkah 7 — Jalankan dengan PM2

```bash
cd ~/panel-gambar/app

# Jalankan Next.js production server di port 3000
pm2 start npm --name "panel-gambar" -- start

# Verifikasi
pm2 status
pm2 logs panel-gambar

# Set PM2 auto-start saat reboot (jalankan perintah sudo yang muncul)
pm2 startup
pm2 save
```

Tes lokal:

```bash
curl http://localhost:3000
```

---

## Langkah 8 — Konfigurasi Nginx (Reverse Proxy)

Buat konfigurasi Nginx untuk `panel-edu.digsan.id`:

```bash
sudo nano /etc/nginx/sites-available/panel-edu.digsan.id
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name panel-edu.digsan.id;

    # Redirect ke HTTPS (akan aktif setelah SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # Timeout untuk WebSocket (Live Session / WebRTC signaling)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Upload file size limit (untuk upload gambar panel)
    client_max_body_size 50M;
}
```

Aktifkan site dan restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/panel-edu.digsan.id /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

Tes akses via browser: `http://panel-edu.digsan.id`

---

## Langkah 9 — Pasang SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d panel-edu.digsan.id
```

Ikuti instruksi:
1. Masukkan email untuk notifikasi renewal
2. Setuju Terms of Service
3. Pilih redirect HTTP → HTTPS (opsi 2)

Setelah berhasil, Certbot otomatis mengubah konfigurasi Nginx untuk HTTPS.

Verifikasi auto-renewal:

```bash
sudo certbot renew --dry-run
```

Tes akses: `https://panel-edu.digsan.id` 🎉

---

## Langkah 10 — Konfigurasi Firewall

```bash
# Aktifkan UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verifikasi
sudo ufw status
```

Output yang diharapkan:

```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)
Nginx Full (v6)            ALLOW       Anywhere (v6)
```

---

## Update & Redeploy

Jika ada update kode, jalankan:

```bash
cd ~/panel-gambar/app
git pull origin main
npm install
npm run build
pm2 restart panel-gambar
```

Buat script untuk mempermudah:

```bash
nano ~/panel-gambar/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "Pulling latest code..."
cd ~/panel-gambar/app
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building..."
npm run build

echo "Restarting PM2..."
pm2 restart panel-gambar

echo "Deploy selesai! https://panel-edu.digsan.id"
```

```bash
chmod +x ~/panel-gambar/deploy.sh
```

Jalankan deploy:

```bash
~/panel-gambar/deploy.sh
```

---

## Monitoring & Logs

```bash
# Status aplikasi
pm2 status

# Log real-time
pm2 logs panel-gambar

# Monitor CPU/Memory
pm2 monit

# Log Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Status SSL
certbot certificates
```

---

## Troubleshooting

### Aplikasi tidak bisa diakses

```bash
# Cek PM2
pm2 status
pm2 logs panel-gambar --lines 50

# Cek Nginx
sudo systemctl status nginx
sudo nginx -t
sudo journalctl -u nginx --no-pager -n 50

# Cek port 3000
ss -tlnp | grep 3000

# Cek firewall
ufw status
```

### Error 502 Bad Gateway

```bash
# PM2 mungkin crash — restart
pm2 restart panel-gambar

# Atau cek apakah port 3000 sudah dipakai proses lain
lsof -i :3000
```

### SSL tidak bisa di-renew

```bash
# Pastikan port 80 bisa diakses
sudo ufw allow 80
sudo certbot renew
```

### Upload gambar gagal (413 Request Entity Too Large)

Pastikan `client_max_body_size` di Nginx sudah cukup besar:

```nginx
client_max_body_size 50M;
```

Lalu restart: `sudo systemctl restart nginx`

---

## Ringkasan Arsitektur

```
                    ┌─────────────────────────┐
                    │    panel-edu.digsan.id   │
                    │      (DNS A Record)      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   IDCloudHost VM         │
                    │   Ubuntu 22.04 LTS       │
                    │   IP: 103.55.37.188      │
                    ├─────────────────────────┤
                    │   Nginx (port 80/443)    │
                    │   + Let's Encrypt SSL    │
                    │   reverse proxy ──────┐  │
                    ├───────────────────────┼──┤
                    │   Next.js (port 3000) ◀  │
                    │   managed by PM2         │
                    ├─────────────────────────┤
                    │   Node.js 20 LTS         │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Supabase Cloud         │
                    │   - Auth                 │
                    │   - PostgreSQL            │
                    │   - Storage              │
                    │   - Realtime             │
                    └─────────────────────────┘
```

---

## Estimasi Biaya IDCloudHost

| Spesifikasi VM | Estimasi Biaya |
|----------------|---------------|
| 1 vCPU, 1 GB RAM, 20 GB SSD | ~Rp 50.000–75.000/bulan |
| 2 vCPU, 2 GB RAM, 40 GB SSD | ~Rp 100.000–150.000/bulan |
| Domain `.id` (renewal) | ~Rp 100.000/tahun |
| SSL (Let's Encrypt) | **Gratis** |
| Supabase (Free Tier) | **Gratis** |

> **Rekomendasi minimum:** 1 vCPU, 1 GB RAM sudah cukup untuk tahap awal/prototipe dengan <50 pengguna concurrent.
