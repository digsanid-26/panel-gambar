"use client";

/**
 * Panel AR Trigger Overlay — merender tombol AR di atas panel cerita
 * berdasarkan `ar-trigger` layers di panel.canvas_data.
 *
 * Posisi dihitung sebagai persentase dari dimensi canvas (width/height)
 * agar berfungsi di viewport apapun. Saat tap, membuka ARSceneModal.
 */

import { useState } from "react";
import type { CanvasLayer, Panel } from "@/lib/types";
import { ARSceneModal } from "@/components/ar-viewer/ar-scene-modal";
import { Sparkles } from "lucide-react";

interface PanelARTriggerOverlayProps {
  panel: Panel;
  /**
   * Jika diberikan, hanya trigger yang ID-nya ada di set ini yang ditampilkan.
   * Set-nya dipetakan dari `ref_id` timeline entry (`cl_<layerId>`).
   * Jika undefined, semua trigger visible.
   */
  visibleRefIds?: Set<string>;
  /** Apakah timeline sedang dipakai (mengontrol filter di atas). */
  useTimelineFilter?: boolean;
}

export function PanelARTriggerOverlay({
  panel,
  visibleRefIds,
  useTimelineFilter = false,
}: PanelARTriggerOverlayProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  let triggers = getARTriggers(panel);
  if (useTimelineFilter && visibleRefIds) {
    // Hanya filter jika ada entry ar-trigger di timeline; kalau tidak ada, tampil semua.
    const hasAny = panel.timeline_data?.some((t) => t.type === "ar-trigger");
    if (hasAny) {
      triggers = triggers.filter((t) => visibleRefIds.has(`cl_${t.id}`));
    }
  }
  if (triggers.length === 0) return null;

  const cw = panel.canvas_data?.width || 800;
  const ch = panel.canvas_data?.height || 600;

  return (
    <>
      {triggers.map((t) => {
        const leftPct = ((t.x + t.width / 2) / cw) * 100;
        const topPct = ((t.y + t.height / 2) / ch) * 100;
        const color = t.arIconColor || "#a855f7";
        const label = t.arLabel || t.name || "Buka AR";
        const slug = t.arSceneSlug;

        return (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (slug) setOpenSlug(slug);
            }}
            disabled={!slug}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              opacity: t.opacity ?? 1,
            }}
            title={label}
            aria-label={label}
          >
            {/* Pulsing halo */}
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: color, opacity: 0.4 }}
            />
            {/* Icon button */}
            <span
              className="relative flex items-center justify-center w-11 h-11 rounded-full shadow-lg border-2 border-white/90 transition-transform group-hover:scale-110 group-active:scale-95"
              style={{ backgroundColor: color }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </span>
            {/* Label tooltip */}
            <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {label}
            </span>
          </button>
        );
      })}

      <ARSceneModal slug={openSlug} onClose={() => setOpenSlug(null)} />
    </>
  );
}

function getARTriggers(panel: Panel): CanvasLayer[] {
  const layers = panel.canvas_data?.layers ?? [];
  return layers.filter(
    (l) => l.type === "ar-trigger" && l.visible !== false && !!l.arSceneSlug
  );
}
