"use client";

/**
 * AR Scene Modal — fullscreen overlay untuk membuka ARScene dari
 * konteks lain (misal: trigger AR di panel cerita).
 *
 * Menggunakan createPortal untuk render di luar pohon DOM parent
 * agar z-index & viewport tidak terpengaruh parent container.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ARSceneViewer } from "./ar-scene-viewer";
import { findARSceneBySlug } from "@/lib/ar/picker";
import type { ARScene } from "@/lib/ar/types";
import { AlertCircle, Loader2, X } from "lucide-react";

interface ARSceneModalProps {
  slug: string | null;
  onClose: () => void;
}

export function ARSceneModal({ slug, onClose }: ARSceneModalProps) {
  const [scene, setScene] = useState<ARScene | null | "loading">("loading");

  useEffect(() => {
    if (!slug) return;
    setScene("loading");
    let cancelled = false;
    (async () => {
      const s = await findARSceneBySlug(slug);
      if (!cancelled) setScene(s ?? null);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Close on Escape
  useEffect(() => {
    if (!slug) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!slug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [slug]);

  if (!slug || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-3 bg-black/60 border-b border-white/10">
        <div className="text-white text-sm font-semibold truncate">
          {scene && scene !== "loading" ? scene.title : "Panel AR"}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto">
          {scene === "loading" && (
            <div className="flex items-center justify-center py-20 text-white/70">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {scene === null && (
            <div className="text-center py-20 text-white/80">
              <AlertCircle className="w-10 h-10 mx-auto text-danger mb-3" />
              <p className="font-semibold">Scene AR tidak ditemukan</p>
              <p className="text-sm text-white/60 mt-1">
                Slug &quot;{slug}&quot; tidak tersedia di konten lokal maupun contoh.
              </p>
            </div>
          )}
          {scene && scene !== "loading" && <ARSceneViewer scene={scene} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
