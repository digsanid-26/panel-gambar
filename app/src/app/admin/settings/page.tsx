"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Settings } from "lucide-react";

interface SettingToggleProps {
  label: string;
  description: string;
  value: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}

function SettingToggle({ label, description, value, saving, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          value ? "bg-primary" : "bg-border"
        } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const SETTINGS_CONFIG = [
  {
    key: "google_login_enabled",
    label: "Login dengan Google",
    description: "Izinkan pengguna mendaftar/masuk menggunakan akun Google OAuth.",
    defaultValue: true,
  },
  {
    key: "public_registration_enabled",
    label: "Registrasi Publik",
    description: "Izinkan siapapun membuat akun baru tanpa undangan.",
    defaultValue: true,
  },
  {
    key: "student_create_story",
    label: "Siswa Bisa Membuat Cerita",
    description: "Jika dinonaktifkan, hanya guru yang bisa membuat cerita baru.",
    defaultValue: false,
  },
  {
    key: "live_session_enabled",
    label: "Sesi Live Aktif",
    description: "Aktifkan fitur baca bersama secara live. Matikan untuk pemeliharaan.",
    defaultValue: true,
  },
  {
    key: "maintenance_mode",
    label: "Mode Pemeliharaan",
    description: "Tampilkan halaman maintenance ke semua pengguna non-admin.",
    defaultValue: false,
  },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const parsed: Record<string, boolean> = {};
        for (const cfg of SETTINGS_CONFIG) {
          const raw = data[cfg.key];
          parsed[cfg.key] = raw !== undefined ? raw === "true" : cfg.defaultValue;
        }
        setValues(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleChange(key: string, newValue: boolean) {
    setValues((v) => ({ ...v, [key]: newValue }));
    setSaving((s) => ({ ...s, [key]: true }));
    setSaved((s) => ({ ...s, [key]: false }));

    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: String(newValue) }),
    });

    setSaving((s) => ({ ...s, [key]: false }));
    setSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Pengaturan Fitur
        </h1>
        <p className="text-sm text-muted mt-1">Konfigurasi fitur dan perilaku aplikasi secara global</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-muted" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl px-5 divide-y-0">
          {SETTINGS_CONFIG.map((cfg) => (
            <div key={cfg.key} className="relative">
              <SettingToggle
                label={cfg.label}
                description={cfg.description}
                value={values[cfg.key] ?? cfg.defaultValue}
                saving={saving[cfg.key] ?? false}
                onChange={(v) => handleChange(cfg.key, v)}
              />
              {(saving[cfg.key] || saved[cfg.key]) && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                  {saving[cfg.key] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted text-center mt-6">
        Perubahan disimpan otomatis ke database dan berlaku segera.
      </p>
    </div>
  );
}
