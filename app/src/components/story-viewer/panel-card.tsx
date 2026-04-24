"use client";

import { useState, useMemo } from "react";
import type { Panel, Dialog, UserProfile, PanelTimelineItem, NarrationOverlay, StoryCharacter } from "@/lib/types";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { PanelARTriggerOverlay } from "./panel-ar-trigger-overlay";
import { PanelCanvasOverlay } from "./panel-canvas-overlay";
import { Mic, Image as ImageIcon, Play, Volume2 } from "lucide-react";

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
  /** Story characters with performer assignments */
  storyCharacters?: StoryCharacter[];
  /** Current user's managed_student ID (if they are a managed student) */
  managedStudentId?: string;
  /** ID of dialog that triggered auto-pause (show play overlay) */
  pausedDialogId?: string | null;
  /** Called when user clicks play on a paused dialog — plays audio then resumes */
  onDialogPlay?: (dialogId: string) => void;
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
  storyCharacters = [],
  managedStudentId,
  pausedDialogId,
  onDialogPlay,
}: PanelCardProps) {
  const [showRecorder, setShowRecorder] = useState<string | null>(null);
  const [playingDialogAudio, setPlayingDialogAudio] = useState<string | null>(null);

  const tl = panel.timeline_data || [];
  const hasTimeline = tl.length > 0;
  const useTimeline = hasTimeline && currentTime !== undefined;

  // Pre-compute visibility for each element type
  const visibility = useMemo(() => {
    if (!useTimeline || currentTime === undefined) {
      return { image: true, narration: true, bgAudio: true, dialogs: new Set<string>(), arTriggers: new Set<string>() };
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

    const visibleARTriggers = new Set<string>();
    tl.filter((t) => t.type === "ar-trigger").forEach((t) => {
      if (isVisibleAt(t, currentTime) && t.ref_id) {
        visibleARTriggers.add(t.ref_id);
      }
    });

    return {
      image: imageItem ? isVisibleAt(imageItem, currentTime) : true,
      narration: narrationItem ? isVisibleAt(narrationItem, currentTime) : true,
      bgAudio: bgAudioItem ? isVisibleAt(bgAudioItem, currentTime) : true,
      dialogs: visibleDialogs,
      arTriggers: visibleARTriggers,
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

        {/* Canvas layers (images, text, shapes, speech bubbles) */}
        {panel.canvas_data && (
          <PanelCanvasOverlay canvasData={panel.canvas_data} />
        )}

        {/* AR Trigger overlays from canvas_data */}
        <PanelARTriggerOverlay
          panel={panel}
          visibleRefIds={visibility.arTriggers}
          useTimelineFilter={useTimeline}
        />

        {/* Narration overlay (inside panel) — timeline-aware */}
        {panel.narration_text && visibility.narration && (() => {
          const no: NarrationOverlay = panel.narration_overlay || {
            position_x: 50, position_y: 85, font_color: "#ffffff",
            bg_color: "#000000", opacity: 0.75, font_size: 14, max_width: 80,
          };
          return (
            <div
              className="absolute z-10 rounded-lg px-3 py-2 transition-all duration-300"
              style={{
                left: `${no.position_x}%`,
                top: `${no.position_y}%`,
                transform: "translate(-50%, -50%)",
                color: no.font_color,
                backgroundColor: no.bg_color,
                opacity: no.opacity,
                fontSize: `${no.font_size || 14}px`,
                maxWidth: `${no.max_width || 80}%`,
              }}
            >
              <p className="leading-relaxed">{panel.narration_text}</p>
            </div>
          );
        })()}

        {/* Narration audio controls (inside panel, bottom-left) */}
        {!compact && (panel.narration_audio_url || (user && user.role === "siswa" && onSaveRecording && panel.narration_text)) && visibility.narration && (
          <div className="absolute bottom-2 left-2 z-20 flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5">
              {panel.narration_audio_url && (
                <AudioPlayer src={panel.narration_audio_url} compact label="Narasi" className="shadow-md !bg-black/60 !text-white hover:!bg-black/80" />
              )}
              {user && user.role === "siswa" && onSaveRecording && panel.narration_text && (
                <button
                  onClick={() => setShowRecorder(showRecorder === "narration" ? null : "narration")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
                >
                  <Mic className="w-3 h-3" />
                  Rekam Narasi
                </button>
              )}
            </div>
            {showRecorder === "narration" && onSaveRecording && (
              <div className="w-64 bg-surface-card/95 backdrop-blur-sm rounded-lg border border-border p-2 shadow-lg">
                <AudioRecorder
                  onSave={(blob) => { onSaveRecording(blob); setShowRecorder(null); }}
                  onCancel={() => setShowRecorder(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Dialog bubbles overlay — timeline-aware */}
        {panel.dialogs?.map((dialog) => {
          const visible = isDialogVisible(dialog);
          const isPausedDialog = pausedDialogId === dialog.id;
          const isPlayingAudio = playingDialogAudio === dialog.id;
          return (
            <div
              key={dialog.id}
              className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-4 py-3 max-w-[200px] transition-all duration-300 ${
                visible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
              } ${isPausedDialog ? "ring-2 ring-primary ring-offset-2 z-30" : ""}`}
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

              {/* Auto-pause play overlay */}
              {isPausedDialog && dialog.audio_url && !isPlayingAudio && (
                <button
                  onClick={() => {
                    setPlayingDialogAudio(dialog.id);
                    const audio = new Audio(dialog.audio_url!);
                    audio.play().catch(() => {});
                    audio.onended = () => {
                      setPlayingDialogAudio(null);
                      onDialogPlay?.(dialog.id);
                    };
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all animate-pulse shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Putar Dialog
                </button>
              )}

              {/* Playing indicator */}
              {isPlayingAudio && (
                <div className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary/20 text-secondary text-xs font-bold">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  Memutar...
                </div>
              )}

              {/* Normal audio + recorder controls (when not in paused state) */}
              {!isPausedDialog && (
                <div className="flex items-center gap-1 mt-2">
                  {dialog.audio_url && (
                    <AudioPlayer src={dialog.audio_url} compact label="🔊" />
                  )}
                  {user && user.role === "siswa" && onSaveRecording && (() => {
                    // Check if this student is the assigned performer for this character
                    const char = storyCharacters.find((c) => c.name === dialog.character_name);
                    const isPerformer = !char?.performed_by || char.performed_by === managedStudentId;
                    if (!isPerformer) return null;
                    return (
                      <button
                        onClick={() => setShowRecorder(showRecorder === dialog.id ? null : dialog.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                      >
                        <Mic className="w-3 h-3" />
                        Rekam
                      </button>
                    );
                  })()}
                </div>
              )}
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

      {/* Background audio */}
      {!compact && panel.background_audio_url && visibility.bgAudio && (
        <div className="mt-3">
          <AudioPlayer src={panel.background_audio_url} label="Suara Latar" />
        </div>
      )}
    </div>
  );
}
