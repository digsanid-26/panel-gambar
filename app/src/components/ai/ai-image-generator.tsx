"use client";

import { useState } from "react";
import { Sparkles, Loader2, Download, Check, RefreshCw, X, Image as ImageIcon } from "lucide-react";

interface AiImageGeneratorProps {
  /** Called when user accepts a generated image — returns the hosted URL */
  onAccept: (url: string) => void;
  /** Optional default prompt */
  defaultPrompt?: string;
  /** Aspect ratio preset */
  aspectRatio?: "16:9" | "4:3" | "1:1" | "3:4";
  /** Label shown on the trigger button */
  label?: string;
  /** Whether to render as a full open panel instead of a collapsible button */
  alwaysOpen?: boolean;
}

const RATIO_SIZES: Record<string, { width: number; height: number }> = {
  "16:9": { width: 896, height: 512 },
  "4:3":  { width: 768, height: 576 },
  "1:1":  { width: 640, height: 640 },
  "3:4":  { width: 576, height: 768 },
};

const STYLE_PRESETS = [
  { value: "",               label: "Default" },
  { value: "flat illustration, vector art",           label: "Flat / Vector" },
  { value: "watercolor painting, soft colors",        label: "Cat Air" },
  { value: "cartoon style, bold outlines",            label: "Kartun" },
  { value: "pixel art, retro 8-bit",                  label: "Pixel Art" },
  { value: "pencil sketch, hand drawn",               label: "Sketsa Pensil" },
];

export function AiImageGenerator({
  onAccept,
  defaultPrompt = "",
  aspectRatio = "16:9",
  label = "Generate Gambar AI",
  alwaysOpen = false,
}: AiImageGeneratorProps) {
  const [open, setOpen] = useState(alwaysOpen);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [style, setStyle] = useState("");
  const [ratio, setRatio] = useState(aspectRatio);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAccepted(false);

    try {
      const { width, height } = RATIO_SIZES[ratio] ?? RATIO_SIZES["16:9"];
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, width, height }),
      });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: "Gagal generate gambar" }));
        setError(errMsg || "Gagal generate gambar");
        return;
      }
      const { url } = await res.json();
      setResult(url);
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (!result) return;
    onAccept(result);
    setAccepted(true);
    if (!alwaysOpen) {
      setTimeout(() => {
        setOpen(false);
        setAccepted(false);
        setResult(null);
      }, 800);
    }
  }

  if (!alwaysOpen && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 text-muted hover:text-primary hover:bg-primary/5 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Generate Gambar dengan AI
        </span>
        {!alwaysOpen && (
          <button
            type="button"
            onClick={() => { setOpen(false); setResult(null); setError(null); }}
            className="text-muted hover:text-foreground rounded p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Deskripsikan gambar yang diinginkan... (Bahasa Indonesia atau Inggris)"
          rows={3}
          className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Style + Ratio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Gaya Ilustrasi</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STYLE_PRESETS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Rasio</label>
          <select
            value={ratio}
            onChange={(e) => setRatio(e.target.value as typeof ratio)}
            className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.keys(RATIO_SIZES).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result preview */}
      {result && (
        <div className="rounded-lg overflow-hidden border border-border bg-background">
          <img src={result} alt="AI Generated" className="w-full object-cover max-h-64" />
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : result ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? "Generating..." : result ? "Generate Ulang" : "Generate"}
        </button>

        {result && !accepted && (
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Gunakan
          </button>
        )}

        {result && (
          <a
            href={result}
            download="ai-generated.png"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border border-border text-foreground hover:bg-surface transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh
          </a>
        )}

        {accepted && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Gambar diterapkan
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted">
        Semua gambar dibuat dengan system prompt aman untuk konten anak-anak.
      </p>
    </div>
  );
}
