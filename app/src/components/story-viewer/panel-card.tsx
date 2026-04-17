"use client";

import { useState } from "react";
import type { Panel, Dialog, UserProfile } from "@/lib/types";
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

export function PanelCard({
  panel,
  index,
  user,
  onSaveRecording,
  compact = false,
  className = "",
}: PanelCardProps) {
  const [showRecorder, setShowRecorder] = useState<string | null>(null);

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
        {panel.image_url ? (
          <img
            src={panel.image_url}
            alt={`Panel ${index + 1}`}
            className="w-full h-auto max-h-[500px] object-contain"
          />
        ) : (
          <div className={`w-full ${compact ? "h-[200px]" : "h-[300px]"} flex items-center justify-center`}>
            <ImageIcon className="w-20 h-20 text-black/10" />
          </div>
        )}

        {/* Dialog bubbles overlay */}
        {panel.dialogs?.map((dialog) => (
          <div
            key={dialog.id}
            className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-4 py-3 max-w-[200px]`}
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
        ))}
      </div>

      {/* Narration */}
      {!compact && panel.narration_text && (
        <div className="mt-4 bg-surface-card rounded-xl border border-border p-4">
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
      {!compact && panel.background_audio_url && (
        <div className="mt-3">
          <AudioPlayer src={panel.background_audio_url} label="Suara Latar" />
        </div>
      )}
    </div>
  );
}
