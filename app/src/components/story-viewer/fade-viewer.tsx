"use client";

import { useState, useCallback } from "react";
import type { Panel, UserProfile } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { StoryProgressBar } from "./story-progress-bar";

interface FadeViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
}

export function FadeViewer({ panels, user, onSaveRecording }: FadeViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [panelTime, setPanelTime] = useState(0);

  const handleIndexChange = useCallback((newIndex: number) => {
    if (newIndex === displayIndex) return;
    setFadingOut(true);
    setPanelTime(0);
    setTimeout(() => {
      setDisplayIndex(newIndex);
      setCurrentIndex(newIndex);
      setFadingOut(false);
    }, 400);
  }, [displayIndex]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setPanelTime(0);
    handleIndexChange(0);
  }, [handleIndexChange]);

  const handleAutoIndex = useCallback((newIndex: number) => {
    handleIndexChange(newIndex);
  }, [handleIndexChange]);

  const currentPanel = panels[displayIndex];
  if (!currentPanel) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Panel content with fade transition */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div
          className="w-full max-w-4xl transition-opacity duration-400 ease-in-out"
          style={{ opacity: fadingOut ? 0 : 1 }}
        >
          <PanelCard
            panel={currentPanel}
            index={displayIndex}
            user={user}
            onSaveRecording={onSaveRecording ? (blob, dialogId) => onSaveRecording(currentPanel.id, blob, dialogId) : undefined}
            currentTime={isPlaying ? panelTime : undefined}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Progress bar */}
      <StoryProgressBar
        panels={panels}
        currentIndex={currentIndex}
        onIndexChange={handleAutoIndex}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
        onPanelTimeUpdate={setPanelTime}
      />
    </div>
  );
}
