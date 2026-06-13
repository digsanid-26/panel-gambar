"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Loader2, Settings } from "lucide-react";

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

const AI_TOGGLES_CONFIG = [
  {
    key: "creator_ai_enabled",
    label: "Mode Creator-AI",
    description: "Aktifkan fitur AI untuk membantu pembuatan cerita, karakter, gambar, suara, dan video.",
    defaultValue: false,
  },
  {
    key: "creator_ai_text_gen",
    label: "AI: Generate Teks",
    description: "Bantu generate dialog, narasi, judul, deskripsi, dan konten teks lainnya.",
    defaultValue: true,
  },
  {
    key: "creator_ai_kurikulum_gen",
    label: "AI: Bantu Kurikulum Merdeka",
    description: "Generate otomatis CP, TP, pertanyaan pemantik, kata kunci, dan refleksi.",
    defaultValue: true,
  },
  {
    key: "creator_ai_image_gen",
    label: "AI: Generate Gambar",
    description: "Generate cover cerita, avatar karakter, latar panel, dan aset gambar.",
    defaultValue: true,
  },
  {
    key: "creator_ai_tts_enabled",
    label: "AI: Generate Suara (TTS)",
    description: "Generate audio narasi dan dialog dari teks menggunakan Text-to-Speech.",
    defaultValue: false,
  },
  {
    key: "creator_ai_video_gen",
    label: "AI: Generate Video Trailer",
    description: "Generate video trailer cerita secara otomatis dari prompt teks.",
    defaultValue: false,
  },
];

const AI_PROVIDERS = [
  { value: "aklaude", label: "aKlaude (Claude via Proxy)" },
];

const AI_TEXT_MODELS = [
  { value: "claude-haiku-4-5",  label: "Claude Haiku 4.5 — Cepat & Hemat" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — Seimbang" },
  { value: "claude-opus-4-7",   label: "Claude Opus 4.7 — Kuat" },
];

const AI_IMAGE_MODELS = [
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "nano-banana-2",   label: "Nano Banana 2" },
];

const AI_VIDEO_MODELS = [
  { value: "veo-3.1-fast", label: "Veo 3.1 Fast — Hemat (€0.40/clip, ada audio)" },
  { value: "veo-3.1",      label: "Veo 3.1 — Kualitas Tinggi (€1.50/clip)" },
  { value: "veo-3-fast",   label: "Veo 3 Fast — Hemat (€0.40/clip)" },
  { value: "veo-3",        label: "Veo 3 — Kualitas Tinggi (€1.50/clip)" },
];

const AI_TTS_PROVIDERS = [
  { value: "elevenlabs", label: "ElevenLabs (Rekomendasi)" },
  { value: "google",     label: "Google Cloud TTS" },
  { value: "openai",     label: "OpenAI TTS" },
];

const AI_SELECT_CONFIG = [
  {
    key: "ai_provider",
    label: "Provider AI",
    description: "Penyedia layanan AI untuk generate teks, gambar, dan video.",
    defaultValue: "aklaude",
    options: AI_PROVIDERS,
  },
  {
    key: "ai_text_model",
    label: "Model Teks",
    description: "Model yang digunakan untuk generate teks dan konten kurikulum.",
    defaultValue: "claude-sonnet-4-6",
    options: AI_TEXT_MODELS,
  },
  {
    key: "ai_image_model",
    label: "Model Gambar",
    description: "Model yang digunakan untuk generate gambar dan ilustrasi.",
    defaultValue: "nano-banana-pro",
    options: AI_IMAGE_MODELS,
  },
  {
    key: "ai_video_model",
    label: "Model Video",
    description: "Model yang digunakan untuk generate video trailer.",
    defaultValue: "veo-3.1-fast",
    options: AI_VIDEO_MODELS,
  },
  {
    key: "ai_tts_provider",
    label: "Provider TTS (Suara)",
    description: "Penyedia layanan Text-to-Speech untuk generate audio narasi dan dialog.",
    defaultValue: "elevenlabs",
    options: AI_TTS_PROVIDERS,
  },
];

export default function AdminSettingsPage() {
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({});
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const toggles: Record<string, boolean> = {};
        for (const cfg of [...SETTINGS_CONFIG, ...AI_TOGGLES_CONFIG]) {
          const raw = data[cfg.key];
          toggles[cfg.key] = raw !== undefined ? raw === "true" : cfg.defaultValue;
        }
        const selects: Record<string, string> = {};
        for (const cfg of AI_SELECT_CONFIG) {
          selects[cfg.key] = data[cfg.key] ?? cfg.defaultValue;
        }
        setToggleValues(toggles);
        setSelectValues(selects);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving((s) => ({ ...s, [key]: true }));
    setSaved((s) => ({ ...s, [key]: false }));
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving((s) => ({ ...s, [key]: false }));
    setSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 1500);
  }

  function handleToggle(key: string, newValue: boolean) {
    setToggleValues((v) => ({ ...v, [key]: newValue }));
    saveSetting(key, String(newValue));
  }

  function handleSelect(key: string, newValue: string) {
    setSelectValues((v) => ({ ...v, [key]: newValue }));
    saveSetting(key, newValue);
  }

  const aiEnabled = toggleValues["creator_ai_enabled"] ?? false;

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
        <div className="space-y-6">
          {/* General Settings */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3 px-1">Umum</h2>
            <div className="bg-surface border border-border rounded-2xl px-5 divide-y-0">
              {SETTINGS_CONFIG.map((cfg) => (
                <div key={cfg.key} className="relative">
                  <SettingToggle
                    label={cfg.label}
                    description={cfg.description}
                    value={toggleValues[cfg.key] ?? cfg.defaultValue}
                    saving={saving[cfg.key] ?? false}
                    onChange={(v) => handleToggle(cfg.key, v)}
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
          </section>

          {/* Creator-AI Toggles */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3 px-1 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Creator-AI
            </h2>
            <div className="bg-surface border border-border rounded-2xl px-5 divide-y-0">
              {AI_TOGGLES_CONFIG.map((cfg) => (
                <div key={cfg.key} className="relative">
                  <SettingToggle
                    label={cfg.label}
                    description={cfg.description}
                    value={toggleValues[cfg.key] ?? cfg.defaultValue}
                    saving={saving[cfg.key] ?? false}
                    onChange={(v) => handleToggle(cfg.key, v)}
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
          </section>

          {/* AI Provider Config — only shown when creator_ai_enabled is on */}
          {aiEnabled && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3 px-1 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Konfigurasi Provider AI
              </h2>
              <div className="bg-surface border border-border rounded-2xl px-5 divide-y divide-border">
                {AI_SELECT_CONFIG.map((cfg) => (
                  <div key={cfg.key} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                      <p className="text-xs text-muted mt-0.5">{cfg.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(saving[cfg.key] || saved[cfg.key]) && (
                        saving[cfg.key]
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />
                          : <Check className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <select
                        value={selectValues[cfg.key] ?? cfg.defaultValue}
                        onChange={(e) => handleSelect(cfg.key, e.target.value)}
                        className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {cfg.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="py-3">
                  <p className="text-xs text-muted">
                    API key disimpan sebagai environment variable di server (<code className="bg-muted/20 px-1 rounded">AI_API_KEY</code>, <code className="bg-muted/20 px-1 rounded">AI_TTS_API_KEY</code>), bukan di database.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      <p className="text-xs text-muted text-center mt-6">
        Perubahan disimpan otomatis ke database dan berlaku segera.
      </p>
    </div>
  );
}
