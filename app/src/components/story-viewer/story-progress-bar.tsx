"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, Square, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Panel, Dialog } from "@/lib/types";
import { getPanelDuration } from "./panel-card";

interface StoryProgressBarProps {
  panels: Panel[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  /** Override duration per panel in seconds — if not set, uses timeline_data */
  panelDuration?: number;
  /** Whether this is a flybox (auto-hides) */
  flybox?: boolean;
  visible?: boolean;
  className?: string;
  /** Callback with current time within the active panel (seconds) */
  onPanelTimeUpdate?: (time: number) => void;
  /** Called when playback auto-pauses on a dialog with audio */
  onDialogPause?: (dialogId: string) => void;
}

export function StoryProgressBar({
  panels,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  onStop,
  panelDuration: panelDurationOverride,
  flybox = false,
  visible = true,
  className,
  onPanelTimeUpdate,
  onDialogPause,
}: StoryProgressBarProps) {
  const [panelProgress, setPanelProgress] = useState(0);
  const [activeAudioIdx, setActiveAudioIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  // Track which dialog IDs have already been paused-on for the current panel
  const pausedDialogsRef = useRef<Set<string>>(new Set());

  // Per-panel durations from timeline data
  const panelDurations = useMemo(
    () => panels.map((p) => panelDurationOverride ?? getPanelDuration(p)),
    [panels, panelDurationOverride]
  );
  const currentPanelDur = panelDurations[currentIndex] || 5;
  const totalDuration = panelDurations.reduce((sum, d) => sum + d, 0);

  // Cumulative start time for each panel (for global progress bar)
  const cumulativeStarts = useMemo(() => {
    const starts: number[] = [0];
    for (let i = 1; i < panelDurations.length; i++) {
      starts.push(starts[i - 1] + panelDurations[i - 1]);
    }
    return starts;
  }, [panelDurations]);

  const globalProgress = totalDuration > 0
    ? ((cumulativeStarts[currentIndex] + (panelProgress / 100) * currentPanelDur) / totalDuration) * 100
    : 0;

  // Auto-advance timer when playing
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    const startTime = performance.now();
    const startProgress = progressRef.current;

    function tick(now: number) {
      const elapsed = (now - startTime) / 1000;
      const newProgress = startProgress + (elapsed / currentPanelDur) * 100;

      if (newProgress >= 100) {
        // Move to next panel
        progressRef.current = 0;
        setPanelProgress(0);
        onPanelTimeUpdate?.(0);
        if (currentIndex < panels.length - 1) {
          onIndexChange(currentIndex + 1);
        } else {
          onStop();
        }
        return;
      }

      progressRef.current = newProgress;
      setPanelProgress(newProgress);
      const currentTimeInPanel = (newProgress / 100) * currentPanelDur;
      onPanelTimeUpdate?.(currentTimeInPanel);

      // Dialog auto-pause: check if a dialog with audio just became visible
      if (onDialogPause) {
        const panel = panels[currentIndex];
        const tl = panel?.timeline_data || [];
        const dialogEntries = tl.filter((t) => t.type === "dialog" && t.ref_id);

        if (dialogEntries.length > 0) {
          // Has timeline data — use timeline entries
          for (const entry of dialogEntries) {
            if (currentTimeInPanel >= entry.start && currentTimeInPanel < entry.start + entry.duration) {
              if (!pausedDialogsRef.current.has(entry.ref_id!)) {
                const dialog = panel.dialogs?.find((d) => d.id === entry.ref_id);
                if (dialog?.audio_url) {
                  pausedDialogsRef.current.add(entry.ref_id!);
                  onDialogPause(entry.ref_id!);
                  return;
                }
              }
            }
          }
        } else {
          // No timeline data — distribute dialogs with audio evenly across panel duration
          const dialogsWithAudio = (panel.dialogs || []).filter((d) => d.audio_url);
          if (dialogsWithAudio.length > 0) {
            const slotDuration = currentPanelDur / (dialogsWithAudio.length + 1);
            for (let di = 0; di < dialogsWithAudio.length; di++) {
              const triggerTime = slotDuration * (di + 1);
              if (currentTimeInPanel >= triggerTime && !pausedDialogsRef.current.has(dialogsWithAudio[di].id)) {
                pausedDialogsRef.current.add(dialogsWithAudio[di].id);
                onDialogPause(dialogsWithAudio[di].id);
                return;
              }
            }
          }
        }
      }

      timerRef.current = requestAnimationFrame(tick);
    }

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, currentIndex, currentPanelDur, panels.length, onIndexChange, onStop, onPanelTimeUpdate, onDialogPause]);

  // Reset panel progress on index change
  useEffect(() => {
    progressRef.current = 0;
    setPanelProgress(0);
    onPanelTimeUpdate?.(0);
    pausedDialogsRef.current = new Set();
  }, [currentIndex]);

  // Create narration audio when panel changes
  useEffect(() => {
    // Stop & discard previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      setActiveAudioIdx(null);
    }

    const panel = panels[currentIndex];
    if (!panel?.narration_audio_url) return;

    const audio = new Audio(panel.narration_audio_url);
    audioRef.current = audio;
    audio.onended = () => setActiveAudioIdx(null);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [currentIndex, panels]);

  // Pause / resume narration audio when isPlaying changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Only play if not already ended
      if (audio.paused && audio.currentTime < (audio.duration || Infinity)) {
        setActiveAudioIdx(currentIndex);
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentIndex]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const targetTime = pct * totalDuration;
    // Find which panel this time falls into
    let targetIdx = 0;
    for (let i = 0; i < cumulativeStarts.length; i++) {
      if (targetTime >= cumulativeStarts[i]) targetIdx = i;
    }
    const clampedIdx = Math.max(0, Math.min(panels.length - 1, targetIdx));
    progressRef.current = 0;
    setPanelProgress(0);
    onPanelTimeUpdate?.(0);
    onIndexChange(clampedIdx);
  }

  function goPrev() {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }

  function goNext() {
    if (currentIndex < panels.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = cumulativeStarts[currentIndex] + (panelProgress / 100 * currentPanelDur);

  if (!visible && flybox) return null;

  return (
    <div
      className={cn(
        "bg-surface-card/95 backdrop-blur-sm border-t border-border px-4 py-2.5 transition-all duration-300",
        flybox && "fixed bottom-0 left-0 right-0 z-50 rounded-t-xl shadow-2xl",
        !visible && flybox && "translate-y-full opacity-0",
        className
      )}
    >
      {/* Progress timeline */}
      <div
        className="relative h-2 bg-border rounded-full cursor-pointer mb-2.5 group"
        onClick={handleSeek}
      >
        {/* Panel segment markers (variable width per panel) */}
        {panels.map((_, i) => (
          i > 0 && (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-surface-card/60 z-10"
              style={{ left: `${(cumulativeStarts[i] / totalDuration) * 100}%` }}
            />
          )
        ))}

        {/* Audio segments highlight */}
        {panels.map((panel, i) => (
          panel.narration_audio_url && (
            <div
              key={`audio-${i}`}
              className="absolute top-0 bottom-0 bg-accent/30 rounded-full"
              style={{
                left: `${(cumulativeStarts[i] / totalDuration) * 100}%`,
                width: `${(panelDurations[i] / totalDuration) * 100}%`,
              }}
            />
          )
        ))}

        {/* Active audio highlight (brighter) */}
        {activeAudioIdx !== null && (
          <div
            className="absolute top-0 bottom-0 bg-accent/60 rounded-full animate-pulse"
            style={{
              left: `${(cumulativeStarts[activeAudioIdx] / totalDuration) * 100}%`,
              width: `${(panelDurations[activeAudioIdx] / totalDuration) * 100}%`,
            }}
          />
        )}

        {/* Progress fill */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-primary rounded-full transition-[width] duration-100"
          style={{ width: `${globalProgress}%` }}
        />

        {/* Scrubber handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${globalProgress}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Left: time */}
        <span className="text-xs font-mono text-muted min-w-[70px]">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {/* Center: controls */}
        <div className="flex items-center gap-1 mx-auto">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-30 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={onStop}
            className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex === panels.length - 1}
            className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-30 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: panel counter */}
        <div className="flex items-center gap-2 min-w-[70px] justify-end">
          {/* Dot indicators (max 12 visible) */}
          {panels.length <= 12 && (
            <div className="flex items-center gap-1">
              {panels.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onIndexChange(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentIndex ? "bg-primary w-4" : "bg-border hover:bg-muted"
                  )}
                />
              ))}
            </div>
          )}
          <span className="text-xs text-muted">
            {currentIndex + 1}/{panels.length}
          </span>
        </div>
      </div>
    </div>
  );
}
