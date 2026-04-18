"use client";

import { useState, useMemo } from "react";
import type { Panel, Dialog, UserProfile, PanelTimelineItem } from "@/lib/types";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { Mic, Image as ImageIcon } from "lucide-react";

interface PanelCardProps {
  panel: Panel;
  index: number;
  user: UserProfile | null;
  onSaveRecording?: (blob: Blob, dialogId?: string) => void;
  /** Hide narration section (e.g. in continuous mode) */
  compact?: boolean;
  className?: string;
  /** Current playback time within this panel (seconds). When provided, elements
   *  are shown/hidden based on their timeline_data schedule. */
  currentTime?: number;
  /** Whether the story is currently playing */
  isPlaying?: boolean;
}

function getBubbleClass(style: string) {
  switch (style) {
    case "oval": return "bubble-oval";
    case "kotak": return "bubble-kotak";
    case "awan": return "bubble-awan";
    case "ledakan": return "bubble-ledakan";
    default: return "bubble-kotak";
  }
}

/** Check if a timeline item is visible at a given time */
function isVisibleAt(item: PanelTimelineItem, time: number): boolean {
  return time >= item.start && time < item.start + item.duration;
}

/** Get the total panel duration from timeline data, or fallback */
export function getPanelDuration(panel: Panel): number {
  const tl = panel.timeline_data;
  if (!tl || tl.length === 0) return 5; // default 5s
  const panelItem = tl.find((t) => t.type === "panel");
  if (panelItem) return panelItem.duration;
  return Math.max(5, ...tl.map((t) => t.start + t.duration));
}

export function PanelCard({
  panel,
  index,
  user,
  onSaveRecording,
  compact = false,
  className = "",
  currentTime,
  isPlaying = false,
}: PanelCardProps) {
  const [showRecorder, setShowRecorder] = useState<string | null>(null);

  const tl = panel.timeline_data || [];
  const hasTimeline = tl.length > 0;
  const useTimeline = hasTimeline && currentTime !== undefined;

  // Pre-compute visibility for each element type
  const visibility = useMemo(() => {
    if (!useTimeline || currentTime === undefined) {
      return { image: true, narration: true, bgAudio: true, dialogs: new Set<string>() };
    }

    const imageItem = tl.find((t) => t.type === "image");
    const narrationItem = tl.find((t) => t.type === "narration-audio");
    const bgAudioItem = tl.find((t) => t.type === "background-audio");

    const visibleDialogs = new Set<string>();
    tl.filter((t) => t.type === "dialog").forEach((t) => {
      if (isVisibleAt(t, currentTime) && t.ref_id) {
        visibleDialogs.add(t.ref_id);
      }
    });

    return {
      image: imageItem ? isVisibleAt(imageItem, currentTime) : true,
      narration: narrationItem ? isVisibleAt(narrationItem, currentTime) : true,
      bgAudio: bgAudioItem ? isVisibleAt(bgAudioItem, currentTime) : true,
      dialogs: visibleDialogs,
    };
  }, [useTimeline, currentTime, tl]);

  /** Determine if a specific dialog should be visible */
  function isDialogVisible(dialog: Dialog): boolean {
    if (!useTimeline) return true; // no timeline → show all
    // If there are dialog timeline entries, check them; otherwise show all
    const hasDialogEntries = tl.some((t) => t.type === "dialog");
    if (!hasDialogEntries) return true;
    return visibility.dialogs.has(dialog.id);
  }

  return (
    <div className={className}>
      <div
        className="relative w-full rounded-2xl border-2 border-border overflow-hidden shadow-lg"
        style={{
          backgroundColor: panel.background_color || "#f0f9ff",
          minHeight: compact ? "200px" : "400px",
        }}
      >
        {/* Panel image */}
        {panel.image_url && visibility.image ? (
          <img
            src={panel.image_url}
            alt={`Panel ${index + 1}`}
            className="w-full aspect-[3/2] object-cover"
          />
        ) : (
          <div className="w-full aspect-[3/2] flex items-center justify-center">
            <ImageIcon className="w-20 h-20 text-black/10" />
          </div>
        )}

        {/* Dialog bubbles overlay — timeline-aware */}
        {panel.dialogs?.map((dialog) => {
          const visible = isDialogVisible(dialog);
          return (
            <div
              key={dialog.id}
              className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-4 py-3 max-w-[200px] transition-all duration-300 ${
                visible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
              }`}
              style={{
                left: `${dialog.position_x}%`,
                top: `${dialog.position_y}%`,
                borderColor: dialog.character_color,
                transform: "translate(-50%, -50%)",
              }}
            >
              <p className="text-xs font-bold mb-1" style={{ color: dialog.character_color }}>
                {dialog.character_name}
              </p>
              <p className="text-sm leading-relaxed">{dialog.text}</p>
              <div className="flex items-center gap-1 mt-2">
                {dialog.audio_url && (
                  <AudioPlayer src={dialog.audio_url} compact label="🔊" />
                )}
                {user && user.role === "siswa" && onSaveRecording && (
                  <button
                    onClick={() => setShowRecorder(showRecorder === dialog.id ? null : dialog.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                  >
                    <Mic className="w-3 h-3" />
                    Rekam
                  </button>
                )}
              </div>
              {showRecorder === dialog.id && onSaveRecording && (
                <div className="mt-2">
                  <AudioRecorder
                    onSave={(blob) => { onSaveRecording(blob, dialog.id); setShowRecorder(null); }}
                    onCancel={() => setShowRecorder(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Narration — timeline-aware */}
      {!compact && panel.narration_text && visibility.narration && (
        <div className={`mt-4 bg-surface-card rounded-xl border border-border p-4 transition-all duration-300 ${
          visibility.narration ? "opacity-100" : "opacity-0"
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{panel.narration_text}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {panel.narration_audio_url && (
                <AudioPlayer src={panel.narration_audio_url} compact label="Dengar" />
              )}
              {user && user.role === "siswa" && onSaveRecording && (
                <button
                  onClick={() => setShowRecorder(showRecorder === "narration" ? null : "narration")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                >
                  <Mic className="w-3 h-3" />
                  Rekam
                </button>
              )}
            </div>
          </div>
          {showRecorder === "narration" && onSaveRecording && (
            <div className="mt-3">
              <AudioRecorder
                onSave={(blob) => { onSaveRecording(blob); setShowRecorder(null); }}
                onCancel={() => setShowRecorder(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Background audio */}
      {!compact && panel.background_audio_url && visibility.bgAudio && (
        <div className="mt-3">
          <AudioPlayer src={panel.background_audio_url} label="Suara Latar" />
        </div>
      )}
    </div>
  );
}
