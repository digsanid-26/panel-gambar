"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Check, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";

interface AiTextButtonProps {
  /** Task type sent to /api/ai/text */
  task: string;
  /** Additional context passed to the AI */
  context?: Record<string, unknown>;
  /** Called when user clicks "Gunakan" with the generated text */
  onAccept: (result: string) => void;
  /** Placeholder text for the prompt textarea */
  promptPlaceholder?: string;
  /** Small label shown on the button, defaults to "AI" */
  label?: string;
  /** Disable the button externally */
  disabled?: boolean;
}

export function AiTextButton({
  task,
  context = {},
  onAccept,
  promptPlaceholder = "Deskripsikan yang ingin di-generate...",
  label = "AI",
  disabled = false,
}: AiTextButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && promptRef.current) {
      promptRef.current.focus();
    }
  }, [open]);

  async function handleGenerate() {
    if (!prompt.trim() && !Object.keys(context).length) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, context, user_prompt: prompt }),
      });

      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: "Gagal menghubungi AI" }));
        setError(errMsg || "Gagal menghubungi AI");
        return;
      }

      const { result: text } = await res.json();
      setResult(text);
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (result) {
      onAccept(result);
      setOpen(false);
      setPrompt("");
      setResult(null);
    }
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  return (
    <div className="w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 transition-colors
          ${open
            ? "bg-primary/10 text-primary"
            : "text-muted hover:text-primary hover:bg-primary/5"
          }
          disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Inline panel */}
      {open && (
        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Generate dengan AI
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted hover:text-foreground rounded p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={promptPlaceholder}
            rows={2}
            className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
            }}
          />

          {/* Result preview */}
          {result && (
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground whitespace-pre-wrap">
              {result}
            </div>
          )}

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : result ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {loading ? "Generating..." : result ? "Coba Lagi" : "Generate"}
            </button>

            {result && (
              <button
                type="button"
                onClick={handleAccept}
                className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Gunakan
              </button>
            )}

            <span className="text-xs text-muted ml-auto hidden sm:block">Ctrl+Enter untuk generate</span>
          </div>
        </div>
      )}
    </div>
  );
}
