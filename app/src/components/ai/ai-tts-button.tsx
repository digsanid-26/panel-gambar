"use client";

import { useState } from "react";
import { Volume2, Loader2, Check, X, Play, Pause } from "lucide-react";

interface AiTtsButtonProps {
  /** Teks yang akan di-generate jadi audio */
  text: string;
  /** voice_id spesifik untuk karakter (override default) */
  voiceId?: string;
  /** emotion untuk TopMediai (Cheerful, Sad, dll) */
  emotion?: string;
  /** Dipanggil saat user klik "Gunakan" — menerima URL audio yang sudah diupload */
  onAccept: (audioUrl: string) => void;
  /** Label tombol trigger */
  label?: string;
  /** Apakah teks kosong / tombol harus disabled */
  disabled?: boolean;
}

const EMOTION_OPTIONS = [
  { value: "",           label: "Default" },
  { value: "Neutral",    label: "Netral" },
  { value: "Cheerful",   label: "Ceria 😊" },
  { value: "Friendly",   label: "Ramah 🤝" },
  { value: "Sad",        label: "Sedih 😢" },
  { value: "Excited",    label: "Antusias 🎉" },
  { value: "Whispering", label: "Berbisik 🤫" },
  { value: "Shouting",   label: "Berteriak 📢" },
  { value: "Hopeful",    label: "Penuh Harap 🌟" },
];

export function AiTtsButton({
  text,
  voiceId,
  emotion: defaultEmotion = "",
  onAccept,
  label = "Generate Suara",
  disabled = false,
}: AiTtsButtonProps) {
  const [open, setOpen] = useState(false);
  const [emotion, setEmotion] = useState(defaultEmotion);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [audioEl] = useState(() => typeof Audio !== "undefined" ? new Audio() : null);

  const trimmedText = text.trim();
  const charCount = trimmedText.length;
  const overLimit = charCount > 500;

  async function handleGenerate() {
    if (!trimmedText || overLimit) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setAccepted(false);
    if (audioEl) { audioEl.pause(); audioEl.src = ""; }
    setPlaying(false);

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmedText,
          ...(voiceId ? { voice_id: voiceId } : {}),
          ...(emotion ? { emotion } : {}),
        }),
      });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: "Gagal generate audio" }));
        setError(errMsg || "Gagal generate audio");
        return;
      }
      const { url } = await res.json();
      setResultUrl(url);
      if (audioEl) audioEl.src = url;
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  function togglePlay() {
    if (!audioEl || !resultUrl) return;
    if (playing) {
      audioEl.pause();
      setPlaying(false);
    } else {
      audioEl.play();
      setPlaying(true);
      audioEl.onended = () => setPlaying(false);
    }
  }

  function handleAccept() {
    if (!resultUrl) return;
    onAccept(resultUrl);
    setAccepted(true);
    setTimeout(() => {
      setOpen(false);
      setAccepted(false);
      setResultUrl(null);
      if (audioEl) { audioEl.pause(); audioEl.src = ""; }
      setPlaying(false);
    }, 800);
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled || !trimmedText}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 text-muted hover:text-accent hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Volume2 className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5" />
          Generate Audio TTS
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setResultUrl(null);
            setError(null);
            if (audioEl) { audioEl.pause(); audioEl.src = ""; }
            setPlaying(false);
          }}
          className="text-muted hover:text-foreground rounded p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Text preview */}
      <div className="rounded-lg bg-surface border border-border px-3 py-2">
        <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{trimmedText || "(teks kosong)"}</p>
        <p className={`text-[10px] mt-1 ${overLimit ? "text-danger font-semibold" : "text-muted"}`}>
          {charCount}/500 karakter
        </p>
      </div>

      {/* Emotion selector */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Ekspresi Suara</label>
        <select
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {EMOTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Audio player preview */}
      {resultUrl && (
        <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors shrink-0"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <span className="text-xs text-muted flex-1">
            {playing ? "Memutar..." : "Preview audio"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !trimmedText || overLimit}
          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
          ) : resultUrl ? (
            <><Volume2 className="w-3.5 h-3.5" /> Generate Ulang</>
          ) : (
            <><Volume2 className="w-3.5 h-3.5" /> Generate Audio</>
          )}
        </button>

        {resultUrl && !accepted && (
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Gunakan
          </button>
        )}

        {accepted && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Audio diterapkan
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted">
        Audio disimpan ke aset cerita dan bisa digunakan ulang.
      </p>
    </div>
  );
}
