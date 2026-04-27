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

  /** Returns the element that actually scrolls. Falls back to window if the inner container isn't a scroll container. */
  const getScroller = useCallback((): HTMLElement | Window => {
    const c = containerRef.current;
    if (c && c.scrollHeight > c.clientHeight + 2) return c;
    return typeof window !== "undefined" ? window : (c as HTMLElement);
  }, []);

  const getScrollTop = useCallback((target: HTMLElement | Window) => {
    if (target instanceof Window) return target.scrollY || document.documentElement.scrollTop;
    return target.scrollTop;
  }, []);

  const setScrollTop = useCallback((target: HTMLElement | Window, value: number) => {
    if (target instanceof Window) target.scrollTo({ top: value, behavior: "instant" as ScrollBehavior });
    else target.scrollTop = value;
  }, []);

  const getMaxScroll = useCallback((target: HTMLElement | Window) => {
    if (target instanceof Window) {
      const doc = document.documentElement;
      return (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    }
    return target.scrollHeight - target.clientHeight;
  }, []);

  // Track current panel based on scroll position
  const updateCurrentFromScroll = useCallback(() => {
    const target = getScroller();
    const top = getScrollTop(target);
    const height = target instanceof Window ? window.innerHeight : target.clientHeight;
    const center = top + height / 2;

    for (let i = panelRefs.current.length - 1; i >= 0; i--) {
      const el = panelRefs.current[i];
      if (el) {
        // Use absolute top relative to document when scrolling window
        const elTop =
          target instanceof Window
            ? el.getBoundingClientRect().top + window.scrollY
            : el.offsetTop;
        if (elTop <= center) {
          setCurrentIndex(i);
          return;
        }
      }
    }
    setCurrentIndex(0);
  }, [getScroller, getScrollTop]);

  // Show/hide flybox on mouse / scroll activity
  useEffect(() => {
    function showFlybox() {
      setFlyboxVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setFlyboxVisible(false);
      }, FLYBOX_HIDE_DELAY);
    }

    window.addEventListener("mousemove", showFlybox);
    window.addEventListener("scroll", showFlybox, { passive: true });
    window.addEventListener("touchstart", showFlybox, { passive: true });
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", showFlybox, { passive: true });
    }

    showFlybox();

    return () => {
      window.removeEventListener("mousemove", showFlybox);
      window.removeEventListener("scroll", showFlybox);
      window.removeEventListener("touchstart", showFlybox);
      if (container) container.removeEventListener("scroll", showFlybox);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Track scroll position for current index (listen on both window & container)
  useEffect(() => {
    function onScroll() {
      updateCurrentFromScroll();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    const container = containerRef.current;
    if (container) container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (container) container.removeEventListener("scroll", onScroll);
    };
  }, [updateCurrentFromScroll]);

  // Auto-scroll animation (top to bottom, looping)
  useEffect(() => {
    if (!autoScroll) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    function tick() {
      const target = getScroller();
      const max = getMaxScroll(target);
      const cur = getScrollTop(target);
      if (max <= 0) {
        // Nothing to scroll yet, wait
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const next = cur + scrollSpeedRef.current;
      if (next >= max) {
        // Reached the end — clamp & stop (no loop)
        setScrollTop(target, max);
        updateCurrentFromScroll();
        setAutoScroll(false);
        return;
      }
      setScrollTop(target, next);
      updateCurrentFromScroll();
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScroll, getScroller, getScrollTop, setScrollTop, getMaxScroll, updateCurrentFromScroll]);

  const togglePlay = useCallback(() => {
    setAutoScroll((prev) => {
      if (prev) return false;
      // Starting: if we're already at (or near) the bottom, restart from top
      const target = getScroller();
      const max = getMaxScroll(target);
      const cur = getScrollTop(target);
      if (max > 0 && cur >= max - 2) {
        setScrollTop(target, 0);
      }
      return true;
    });
  }, [getScroller, getScrollTop, setScrollTop, getMaxScroll]);

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
