"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Panel, UserProfile, StoryCharacter } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { ScrollSpeedDial } from "./scroll-speed-dial";
import { ArrowDown } from "lucide-react";

interface VerticalScrollViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
  storyCharacters?: StoryCharacter[];
  managedStudentId?: string;
}

const DEFAULT_SCROLL_SPEED = 1.5; // px per frame
const FLYBOX_HIDE_DELAY = 3000; // ms

export function VerticalScrollViewer({ panels, user, onSaveRecording, storyCharacters, managedStudentId }: VerticalScrollViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flyboxVisible, setFlyboxVisible] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(DEFAULT_SCROLL_SPEED);
  const scrollSpeedRef = useRef(scrollSpeed);
  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<number | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track current panel based on scroll position
  const updateCurrentFromScroll = useCallback(() => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.scrollTop;
    const containerHeight = containerRef.current.clientHeight;
    const center = containerTop + containerHeight / 2;

    for (let i = panelRefs.current.length - 1; i >= 0; i--) {
      const el = panelRefs.current[i];
      if (el && el.offsetTop <= center) {
        setCurrentIndex(i);
        return;
      }
    }
    setCurrentIndex(0);
  }, []);

  // Show/hide flybox on mouse activity
  useEffect(() => {
    function showFlybox() {
      setFlyboxVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setFlyboxVisible(false);
      }, FLYBOX_HIDE_DELAY);
    }

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousemove", showFlybox);
    container.addEventListener("scroll", showFlybox);
    container.addEventListener("touchstart", showFlybox);

    // Initial show
    showFlybox();

    return () => {
      container.removeEventListener("mousemove", showFlybox);
      container.removeEventListener("scroll", showFlybox);
      container.removeEventListener("touchstart", showFlybox);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Track scroll position for current index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onScroll() {
      updateCurrentFromScroll();
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateCurrentFromScroll]);

  // Auto-scroll animation (top to bottom, looping)
  useEffect(() => {
    if (!autoScroll || !containerRef.current) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    function tick() {
      const container = containerRef.current;
      if (!container) return;

      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop += scrollSpeedRef.current;

      if (container.scrollTop >= maxScroll) {
        // Loop back to top
        container.scrollTop = 0;
      }

      updateCurrentFromScroll();
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScroll, updateCurrentFromScroll]);

  const togglePlay = useCallback(() => {
    setAutoScroll((prev) => !prev);
  }, []);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollBehavior: autoScroll ? "auto" : "smooth" }}
      >
        {/* Seamless panel container — no gaps for complete panels */}
        <div className="max-w-4xl mx-auto">
          {panels.map((panel, i) => {
            const isComplete = panel.panel_type === "complete";
            return (
              <div
                key={panel.id}
                ref={(el) => { panelRefs.current[i] = el; }}
                className={isComplete ? "" : "px-4 sm:px-8 py-4"}
              >
                <PanelCard
                  panel={panel}
                  index={i}
                  user={user}
                  onSaveRecording={onSaveRecording ? (blob, dialogId) => onSaveRecording(panel.id, blob, dialogId) : undefined}
                  storyCharacters={storyCharacters}
                  managedStudentId={managedStudentId}
                  className={isComplete ? "!rounded-none !border-x-0 !shadow-none" : ""}
                />
              </div>
            );
          })}

          {/* End indicator */}
          <div className="flex items-center justify-center py-8 text-muted">
            <ArrowDown className="w-5 h-5 mr-2" />
            <span className="text-sm">Akhir cerita</span>
          </div>
        </div>
      </div>

      {/* Floating auto-scroll dial (play + circular speed slider) */}
      <ScrollSpeedDial
        isPlaying={autoScroll}
        onTogglePlay={togglePlay}
        speed={scrollSpeed}
        onSpeedChange={setScrollSpeed}
        visible={flyboxVisible || autoScroll}
      />
    </div>
  );
}
