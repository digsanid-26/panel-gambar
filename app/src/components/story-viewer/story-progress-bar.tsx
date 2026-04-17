"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Square, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Panel } from "@/lib/types";

interface StoryProgressBarProps {
  panels: Panel[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  /** Duration per panel in seconds (for auto-play modes) */
  panelDuration?: number;
  /** Whether this is a flybox (auto-hides) */
  flybox?: boolean;
  visible?: boolean;
  className?: string;
}

export function StoryProgressBar({
  panels,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayPause,
  onStop,
  panelDuration = 5,
  flybox = false,
  visible = true,
  className,
}: StoryProgressBarProps) {
  const [panelProgress, setPanelProgress] = useState(0);
  const [activeAudioIdx, setActiveAudioIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const totalDuration = panels.length * panelDuration;
  const globalProgress = ((currentIndex + panelProgress / 100) / panels.length) * 100;

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
      const newProgress = startProgress + (elapsed / panelDuration) * 100;

      if (newProgress >= 100) {
        // Move to next panel
        progressRef.current = 0;
        setPanelProgress(0);
        if (currentIndex < panels.length - 1) {
          onIndexChange(currentIndex + 1);
        } else {
          onStop();
        }
        return;
      }

      progressRef.current = newProgress;
      setPanelProgress(newProgress);
      timerRef.current = requestAnimationFrame(tick);
    }

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, currentIndex, panelDuration, panels.length, onIndexChange, onStop]);

  // Reset panel progress on index change
  useEffect(() => {
    progressRef.current = 0;
    setPanelProgress(0);
  }, [currentIndex]);

  // Play narration audio for current panel
  useEffect(() => {
    const panel = panels[currentIndex];
    if (!panel) return;

    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setActiveAudioIdx(null);
    }

    if (panel.narration_audio_url && isPlaying) {
      const audio = new Audio(panel.narration_audio_url);
      audioRef.current = audio;
      setActiveAudioIdx(currentIndex);
      audio.play().catch(() => {});
      audio.onended = () => setActiveAudioIdx(null);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentIndex, isPlaying]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const targetPanel = Math.floor(pct * panels.length);
    const clampedIdx = Math.max(0, Math.min(panels.length - 1, targetPanel));
    progressRef.current = 0;
    setPanelProgress(0);
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

  const currentTime = (currentIndex * panelDuration) + (panelProgress / 100 * panelDuration);

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
        {/* Panel segment markers */}
        {panels.map((_, i) => (
          i > 0 && (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-surface-card/60 z-10"
              style={{ left: `${(i / panels.length) * 100}%` }}
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
                left: `${(i / panels.length) * 100}%`,
                width: `${(1 / panels.length) * 100}%`,
              }}
            />
          )
        ))}

        {/* Active audio highlight (brighter) */}
        {activeAudioIdx !== null && (
          <div
            className="absolute top-0 bottom-0 bg-accent/60 rounded-full animate-pulse"
            style={{
              left: `${(activeAudioIdx / panels.length) * 100}%`,
              width: `${(1 / panels.length) * 100}%`,
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
