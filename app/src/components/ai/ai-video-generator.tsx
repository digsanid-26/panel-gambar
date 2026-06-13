"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, RefreshCw, X, Film, Download, Image as ImageIcon } from "lucide-react";

interface AiVideoGeneratorProps {
  onAccept: (url: string) => void;
  defaultPrompt?: string;
  label?: string;
  alwaysOpen?: boolean;
  /** Optional first-frame image reference (data URL or public URL) */
  coverImageUrl?: string;
}

const STYLE_PRESETS = [
  { value: "", label: "Default" },
  { value: "2D animated, children's cartoon style, colorful",  label: "Kartun 2D" },
  { value: "flat design animation, vector style, bright colors", label: "Flat Design" },
  { value: "stop motion animation, paper craft style",          label: "Stop Motion" },
  { value: "whiteboard animation, hand drawn style",            label: "Whiteboard" },
  { value: "cinematic, gentle camera movement, nature",         label: "Sinematik" },
];

const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
];

export function AiVideoGenerator({
  onAccept,
  defaultPrompt = "",
  label = "Generate Video AI",
  alwaysOpen = false,
  coverImageUrl,
}: AiVideoGeneratorProps) {
  const [open, setOpen] = useState(alwaysOpen);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [style, setStyle] = useState("");
  const [ratio, setRatio] = useState<"16:9" | "9:16">("16:9");
  const [useImageRef, setUseImageRef] = useState(!!coverImageUrl);
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
      const fullPrompt = style ? `${prompt}, ${style}` : prompt;

      // If cover image is a public URL (not data URL), fetch and convert
      let imageRef: string | undefined;
      if (coverImageUrl && useImageRef) {
        if (coverImageUrl.startsWith("data:")) {
          imageRef = coverImageUrl;
        } else {
          // Pass URL as-is; aKlaude may accept URLs too
          imageRef = coverImageUrl;
        }
      }

      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          ratio,
          resolution: "720p",
          ...(imageRef ? { image: imageRef } : {}),
        }),
      });

      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: "Gagal generate video" }));
        setError(errMsg || "Gagal generate video");
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
    <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5" />
          Generate Video Trailer dengan AI
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
        <label className="block text-xs font-medium text-muted mb-1">Deskripsi Video</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Deskripsikan adegan video trailer... Misal: Anak-anak bermain di taman sambil belajar mengenal warna-warni bunga"
          rows={3}
          className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {/* Style + Ratio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Gaya Animasi</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
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
            onChange={(e) => setRatio(e.target.value as "16:9" | "9:16")}
            className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            {RATIO_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Image reference toggle */}
      {coverImageUrl && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useImageRef}
            onChange={(e) => setUseImageRef(e.target.checked)}
            className="rounded"
          />
          <ImageIcon className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs text-muted">Gunakan cover sebagai referensi frame pertama</span>
        </label>
      )}

      {/* Notes */}
      <p className="text-[10px] text-muted bg-muted/10 rounded-lg px-2.5 py-1.5">
        ⏱ Generate video biasanya membutuhkan waktu 30–90 detik. Hasilnya clip 8 detik (veo-3.1-fast) dengan audio otomatis.
      </p>

      {/* Result preview */}
      {result && (
        <div className="rounded-lg overflow-hidden border border-border bg-black">
          <video
            src={result}
            controls
            className="w-full max-h-48 object-contain"
          />
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-secondary text-white hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating… (30–90s)
            </>
          ) : result ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Generate Ulang
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate Video
            </>
          )}
        </button>

        {result && !accepted && (
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Gunakan sebagai Trailer
          </button>
        )}

        {result && (
          <a
            href={result}
            download="ai-video-trailer.mp4"
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
            <Check className="w-3.5 h-3.5" /> Video diterapkan
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted">
        Video di-generate dengan konteks konten aman untuk anak-anak. URL valid 24 jam — segera simpan ke aset.
      </p>
    </div>
  );
}
