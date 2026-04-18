"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Panel, UserProfile, StoryCharacter } from "@/lib/types";
import { PanelCard } from "./panel-card";
import { StoryProgressBar } from "./story-progress-bar";
import { ArrowDown, Infinity } from "lucide-react";

interface VerticalScrollViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
  storyCharacters?: StoryCharacter[];
  managedStudentId?: string;
}

const AUTO_SCROLL_SPEED = 1.5; // px per frame
const FLYBOX_HIDE_DELAY = 3000; // ms

export function VerticalScrollViewer({ panels, user, onSaveRecording, storyCharacters, managedStudentId }: VerticalScrollViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [flyboxVisible, setFlyboxVisible] = useState(true);
  const [infinityScroll, setInfinityScroll] = useState(false);

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

  // Infinity scroll auto-animation (top to bottom)
  useEffect(() => {
    if (!infinityScroll || !containerRef.current) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    function tick() {
      const container = containerRef.current;
      if (!container) return;

      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop += AUTO_SCROLL_SPEED;

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
  }, [infinityScroll, updateCurrentFromScroll]);

  const handleIndexChange = useCallback((index: number) => {
    const el = panelRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setCurrentIndex(index);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setInfinityScroll(false);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setCurrentIndex(0);
  }, []);

  const toggleInfinity = useCallback(() => {
    setInfinityScroll((prev) => !prev);
  }, []);

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: infinityScroll ? "auto" : "smooth" }}
      >
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8 space-y-8">
          {panels.map((panel, i) => (
            <div
              key={panel.id}
              ref={(el) => { panelRefs.current[i] = el; }}
            >
              <PanelCard
                panel={panel}
                index={i}
                user={user}
                onSaveRecording={onSaveRecording ? (blob, dialogId) => onSaveRecording(panel.id, blob, dialogId) : undefined}
                storyCharacters={storyCharacters}
                managedStudentId={managedStudentId}
              />
            </div>
          ))}

          {/* End indicator */}
          <div className="flex items-center justify-center py-8 text-muted">
            <ArrowDown className="w-5 h-5 mr-2" />
            <span className="text-sm">Akhir cerita</span>
          </div>
        </div>
      </div>

      {/* Flybox controls */}
      <StoryProgressBar
        panels={panels}
        currentIndex={currentIndex}
        onIndexChange={handleIndexChange}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onStop={handleStop}
        flybox
        visible={flyboxVisible}
      />

      {/* Infinity scroll toggle button */}
      <button
        onClick={toggleInfinity}
        className={`fixed bottom-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all ${
          infinityScroll
            ? "bg-primary text-white"
            : "bg-surface-card text-muted border border-border hover:text-foreground"
        } ${flyboxVisible ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-300`}
        title={infinityScroll ? "Stop Infinity Scroll" : "Infinity Scroll"}
      >
        <Infinity className="w-5 h-5" />
      </button>
    </div>
  );
}
