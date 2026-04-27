"use client";

/**
 * PanelTimelineOverlay
 *
 * Yellow vertical timeline at the left edge of a complete panel, with orange
 * circles marking the position of each "trigger" timeline item (dialog,
 * narration audio, AR trigger, etc.). Used by VerticalScrollViewer.
 *
 * The vertical position of each circle is computed as:
 *   y = (item.start / panelDuration) * panelHeight
 *
 * The overlay also surfaces firing-time markers via the `triggers` callback so
 * the parent viewer can detect when the global playhead (red play icon at
 * viewport 50vh) crosses each circle.
 */

import { useMemo } from "react";
import type { Panel, PanelTimelineItem } from "@/lib/types";
import { Mic, MessageCircle, Sparkles, Music, Image as ImageIcon } from "lucide-react";

export interface TimelineTrigger {
  id: string;
  /** Y offset within the panel (px) */
  y: number;
  /** Time within the panel (s) when this trigger fires */
  t: number;
  type: PanelTimelineItem["type"];
  label: string;
  /** Optional reference id (dialog id, canvas layer id, etc.) */
  refId?: string;
}

/** Items considered as scroll-pausing triggers. Background audio is excluded
 * because it should play continuously without pausing scroll. */
export const PAUSING_TRIGGER_TYPES: PanelTimelineItem["type"][] = [
  "dialog",
  "narration-audio",
  "ar-trigger",
];

/** Build the list of triggers shown as orange dots and used for crossing
 * detection. Returns triggers in time order. */
export function buildTriggers(panel: Panel, panelDurationSec: number, panelHeightPx: number): TimelineTrigger[] {
  const tl = (panel.timeline_data as PanelTimelineItem[] | undefined) || [];
  if (!tl.length || panelDurationSec <= 0 || panelHeightPx <= 0) return [];

  return tl
    .filter((it) => it.type !== "panel") // skip the panel-duration backbone
    .map<TimelineTrigger>((it) => ({
      id: it.id,
      t: Math.max(0, Math.min(it.start, panelDurationSec)),
      y: Math.round((Math.max(0, Math.min(it.start, panelDurationSec)) / panelDurationSec) * panelHeightPx),
      type: it.type,
      label: it.label,
      refId: it.ref_id,
    }))
    .sort((a, b) => a.t - b.t);
}

interface PanelTimelineOverlayProps {
  panel: Panel;
  panelDurationSec: number;
  /** Optional id of trigger currently firing (gets a pulsing highlight) */
  firingTriggerId?: string | null;
  /** Set of trigger ids that have already been played in this pass */
  playedTriggerIds?: Set<string>;
}

function iconForType(type: PanelTimelineItem["type"]) {
  const cls = "w-2.5 h-2.5 text-white";
  switch (type) {
    case "dialog": return <MessageCircle className={cls} />;
    case "narration-audio": return <Mic className={cls} />;
    case "background-audio": return <Music className={cls} />;
    case "ar-trigger": return <Sparkles className={cls} />;
    case "image":
    case "bubble":
    default: return <ImageIcon className={cls} />;
  }
}

export function PanelTimelineOverlay({
  panel,
  panelDurationSec,
  firingTriggerId,
  playedTriggerIds,
}: PanelTimelineOverlayProps) {
  const tl = (panel.timeline_data as PanelTimelineItem[] | undefined) || [];

  // Position circles by fractional time, rendered as percent so we don't need
  // to know the pixel height during render — works with any panel size.
  const circles = useMemo(() => {
    if (!tl.length || panelDurationSec <= 0) return [];
    return tl
      .filter((it) => it.type !== "panel")
      .map((it) => ({
        id: it.id,
        type: it.type,
        label: it.label,
        topPct: Math.max(0, Math.min(100, (it.start / panelDurationSec) * 100)),
      }))
      .sort((a, b) => a.topPct - b.topPct);
  }, [tl, panelDurationSec]);

  if (circles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 left-0 z-30"
      style={{ width: "16px" }}
      aria-hidden
    >
      {/* Yellow vertical line */}
      <div
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: "3px",
          background: "linear-gradient(to bottom, #fde047 0%, #facc15 50%, #eab308 100%)",
          boxShadow: "0 0 6px rgba(250, 204, 21, 0.5)",
        }}
      />

      {/* Orange circles per trigger */}
      {circles.map((c) => {
        const isFiring = firingTriggerId === c.id;
        const isPlayed = playedTriggerIds?.has(c.id);
        return (
          <div
            key={c.id}
            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all ${
              isFiring ? "ring-4 ring-red-500/60 animate-pulse" : ""
            }`}
            style={{
              top: `${c.topPct}%`,
              width: "16px",
              height: "16px",
              background: isPlayed
                ? "linear-gradient(135deg, #84cc16, #65a30d)"
                : "linear-gradient(135deg, #fb923c, #ea580c)",
              boxShadow: isFiring
                ? "0 0 12px rgba(239, 68, 68, 0.8)"
                : "0 0 6px rgba(251, 146, 60, 0.6)",
              border: "2px solid white",
            }}
            title={c.label}
          >
            {iconForType(c.type)}
          </div>
        );
      })}
    </div>
  );
}
