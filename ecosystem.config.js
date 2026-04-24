module.exports = {
  apps: [
    {
      name: 'panel-gambar',
      cwd: './app',
      script: 'node_modules/.bin/next',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      // VPS kecil — batasi memory agar tidak swap/thrash
      max_memory_restart: '512M',
      // Jangan restart otomatis saat file berubah (terlalu boros resource)
      watch: false,
      // Restart strategy
      autorestart: true,
      min_uptime: '10s',
      // PM2 cluster mode on -> set ke 1 instance untuk VPS entry-level
      // Jalankan sebagai 'fork' (bukan cluster) agar Next.js bisa handle SSR
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Merge logs untuk hemat disk
      merge_logs: true,
      // Biarkan PM2 pakai default ~/.pm2/logs agar tidak ada masalah path
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Kill timeout: beri Next.js waktu untuk graceful shutdown
      kill_timeout: 5000,
    },
  ],
};
