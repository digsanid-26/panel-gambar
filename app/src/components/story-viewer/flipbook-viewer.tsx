"use client";

import { useState, useCallback } from "react";
import type { Panel, UserProfile } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { StoryProgressBar } from "./story-progress-bar";

interface FlipBookViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
}

export function FlipBookViewer({ panels, user, onSaveRecording }: FlipBookViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flipState, setFlipState] = useState<"idle" | "flipping">("idle");
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [displayIndex, setDisplayIndex] = useState(0);

  const handleIndexChange = useCallback((newIndex: number) => {
    if (newIndex === displayIndex || flipState === "flipping") return;
    setFlipDirection(newIndex > displayIndex ? "next" : "prev");
    setFlipState("flipping");

    setTimeout(() => {
      setDisplayIndex(newIndex);
      setCurrentIndex(newIndex);
      setFlipState("idle");
    }, 600);
  }, [displayIndex, flipState]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    handleIndexChange(0);
  }, [handleIndexChange]);

  const currentPanel = panels[displayIndex];
  const nextPanel = panels[displayIndex + 1];
  const prevPanel = panels[displayIndex - 1];

  if (!currentPanel) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Flip book container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl" style={{ perspective: "1500px" }}>
          {/* Book container */}
          <div className="relative">
            {/* Previous page (visible when flipping back) */}
            {prevPanel && flipState === "flipping" && flipDirection === "prev" && (
              <div className="absolute inset-0 z-0">
                <PanelCard
                  panel={prevPanel}
                  index={displayIndex - 1}
                  user={user}
                  compact
                />
              </div>
            )}

            {/* Current page */}
            <div
              className={`relative z-10 transition-transform duration-600 ease-in-out ${
                flipState === "flipping"
                  ? flipDirection === "next"
                    ? "origin-left"
                    : "origin-right"
                  : ""
              }`}
              style={
                flipState === "flipping"
                  ? {
                      transform: flipDirection === "next"
                        ? "rotateY(-180deg)"
                        : "rotateY(180deg)",
                      transformOrigin: flipDirection === "next" ? "left center" : "right center",
                    }
                  : undefined
              }
            >
              <div
                className={`${flipState === "flipping" ? "pointer-events-none" : ""}`}
                style={
                  flipState === "flipping"
                    ? { backfaceVisibility: "hidden" }
                    : undefined
                }
              >
                <PanelCard
                  panel={currentPanel}
                  index={displayIndex}
                  user={user}
                  onSaveRecording={onSaveRecording ? (blob, dialogId) => onSaveRecording(currentPanel.id, blob, dialogId) : undefined}
                />
              </div>
            </div>

            {/* Next page (visible when flipping forward) */}
            {nextPanel && flipState === "flipping" && flipDirection === "next" && (
              <div className="absolute inset-0 z-0">
                <PanelCard
                  panel={nextPanel}
                  index={displayIndex + 1}
                  user={user}
                  compact
                />
              </div>
            )}

            {/* Page number indicator */}
            <div className="flex justify-center mt-4 gap-1">
              <span className="text-xs text-muted bg-surface-card px-3 py-1 rounded-full border border-border">
                Halaman {displayIndex + 1} dari {panels.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <StoryProgressBar
        panels={panels}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
        panelDuration={7}
      />
    </div>
  );
}
