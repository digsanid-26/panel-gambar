"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Panel, UserProfile, StoryCharacter } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { StoryProgressBar } from "./story-progress-bar";

interface ContinuousViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
  storyCharacters?: StoryCharacter[];
  managedStudentId?: string;
}

const SCROLL_SPEED = 1; // px per frame (~60px/sec at 60fps)

export function ContinuousViewer({ panels, user, onSaveRecording, storyCharacters, managedStudentId }: ContinuousViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const scrollPosRef = useRef(0);

  // Determine current panel index based on scroll position
  const updateCurrentIndex = useCallback(() => {
    if (!stripRef.current) return;
    const container = stripRef.current.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const centerX = scrollPosRef.current + containerWidth / 2;
    // Each panel card is roughly containerWidth wide (with some gap)
    const panelElements = stripRef.current.children;
    let cumWidth = 0;
    for (let i = 0; i < panelElements.length; i++) {
      const el = panelElements[i] as HTMLElement;
      cumWidth += el.offsetWidth + 24; // 24px gap
      if (cumWidth > centerX) {
        setCurrentIndex(i);
        return;
      }
    }
    setCurrentIndex(panels.length - 1);
  }, [panels.length]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || hovered) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    function tick() {
      if (!stripRef.current) return;
      const maxScroll = stripRef.current.scrollWidth - (stripRef.current.parentElement?.clientWidth || 0);
      scrollPosRef.current = Math.min(scrollPosRef.current + SCROLL_SPEED, maxScroll);

      stripRef.current.style.transform = `translateX(-${scrollPosRef.current}px)`;
      updateCurrentIndex();

      if (scrollPosRef.current >= maxScroll) {
        // Reached end
        setIsPlaying(false);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, hovered, updateCurrentIndex]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    scrollPosRef.current = 0;
    if (stripRef.current) {
      stripRef.current.style.transform = `translateX(0px)`;
    }
    setCurrentIndex(0);
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    if (!stripRef.current) return;
    // Approximate scroll to panel index
    const panelElements = stripRef.current.children;
    let cumWidth = 0;
    for (let i = 0; i < index; i++) {
      const el = panelElements[i] as HTMLElement;
      if (el) cumWidth += el.offsetWidth + 24;
    }
    scrollPosRef.current = cumWidth;
    stripRef.current.style.transform = `translateX(-${cumWidth}px)`;
    setCurrentIndex(index);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Continuous panel strip */}
      <div
        className="flex-1 overflow-hidden relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hover pause indicator */}
        {hovered && isPlaying && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            ⏸ Dijeda (hover)
          </div>
        )}

        <div className="h-full flex items-center px-8">
          <div
            ref={stripRef}
            className="flex gap-6 transition-none will-change-transform"
            style={{ transform: `translateX(-${scrollPosRef.current}px)` }}
          >
            {panels.map((panel, i) => (
              <div key={panel.id} className="shrink-0 w-[80vw] max-w-3xl">
                <PanelCard
                  panel={panel}
                  index={i}
                  user={user}
                  onSaveRecording={onSaveRecording ? (blob, dialogId) => onSaveRecording(panel.id, blob, dialogId) : undefined}
                  compact
                  storyCharacters={storyCharacters}
                  managedStudentId={managedStudentId}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <StoryProgressBar
        panels={panels}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        isPlaying={isPlaying && !hovered}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
      />
    </div>
  );
}
