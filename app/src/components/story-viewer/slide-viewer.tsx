"use client";

import { useState, useCallback } from "react";
import type { Panel, UserProfile } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { StoryProgressBar } from "./story-progress-bar";

interface SlideViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
}

export function SlideViewer({ panels, user, onSaveRecording }: SlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [panelTime, setPanelTime] = useState(0);

  const currentPanel = panels[currentIndex];

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setPanelTime(0);
  }, []);

  if (!currentPanel) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Panel content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl panel-enter" key={currentPanel.id}>
          <PanelCard
            panel={currentPanel}
            index={currentIndex}
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
        onIndexChange={(idx) => { setCurrentIndex(idx); setPanelTime(0); }}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
        onPanelTimeUpdate={setPanelTime}
      />
    </div>
  );
}
