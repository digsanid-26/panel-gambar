"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Panel, UserProfile, StoryCharacter, PanelTimelineItem } from "@/lib/types";
import { PanelCard, getPanelDuration } from "./panel-card";
import { ScrollSpeedDial } from "./scroll-speed-dial";
import { PanelTimelineOverlay, PAUSING_TRIGGER_TYPES } from "./panel-timeline-overlay";
import { PlayheadIndicator } from "./playhead-indicator";
import { ArrowDown, Play as PlayIcon, Music, MusicIcon as _musicAlias, VolumeX } from "lucide-react";
// Note: Music icon used for the bg-audio toggle next to the playhead.
void _musicAlias;

interface VerticalScrollViewerProps {
  panels: Panel[];
  user: UserProfile | null;
  onSaveRecording?: (panelId: string, blob: Blob, dialogId?: string) => void;
  storyCharacters?: StoryCharacter[];
  managedStudentId?: string;
}

const DEFAULT_SCROLL_SPEED = 1.5; // px per frame
const FLYBOX_HIDE_DELAY = 3000; // ms

interface FiringTrigger {
  panelId: string;
  triggerId: string;
  type: PanelTimelineItem["type"];
  label: string;
  /** True when scroll/auto-scroll is paused waiting for user/audio */
  pausing: boolean;
}

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

  // Playhead-trigger system
  const [firing, setFiring] = useState<FiringTrigger | null>(null);
  // For each panel: last known playhead time, set of fired trigger ids
  const playheadTimesRef = useRef<Record<string, number>>({});
  const firedRef = useRef<Record<string, Set<string>>>({});
  // Audio element used for trigger playback (pausing kind)
  const triggerAudioRef = useRef<HTMLAudioElement | null>(null);
  // Audio element for background-audio (non-pausing)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioPanelRef = useRef<string | null>(null);
  // Whether autoScroll was active before pausing (to know if we should resume)
  const wasAutoScrollingRef = useRef(false);

  /** Surface bg-audio state to the music toggle button next to the playhead. */
  const [bgPlaying, setBgPlaying] = useState(false);
  /** When true the user explicitly stopped bg audio and does not want it
   * auto-restarted on auto-scroll start or panel change. Reset whenever the
   * user clicks the music button to play again. */
  const bgManualStopRef = useRef(false);

  /** Play (loop) the background audio of the panel at index `i`. No-op if the
   * panel has no bg audio. Replaces any currently playing bg audio. */
  const playBgForPanelIndex = useCallback((i: number) => {
    const panel = panels[i];
    if (!panel) return;
    const url = panel.background_audio_url;
    if (!url) {
      // No bg audio for this panel — stop any existing playback.
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
        bgAudioPanelRef.current = null;
        setBgPlaying(false);
      }
      return;
    }
    // If we're already looping the same URL for this panel, do nothing.
    if (bgAudioRef.current && bgAudioPanelRef.current === panel.id) return;

    if (bgAudioRef.current) bgAudioRef.current.pause();
    const a = new Audio(url);
    a.loop = true;
    a.volume = 0.5;
    a.play().then(() => setBgPlaying(true)).catch(() => setBgPlaying(false));
    bgAudioRef.current = a;
    bgAudioPanelRef.current = panel.id;
  }, [panels]);

  /** Stop bg audio playback. Does not clear `bgManualStopRef` — caller decides. */
  const stopBg = useCallback(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current = null;
      bgAudioPanelRef.current = null;
    }
    setBgPlaying(false);
  }, []);

  /** Manual toggle wired to the music button next to the playhead. */
  const toggleBgAudio = useCallback(() => {
    if (bgPlaying) {
      bgManualStopRef.current = true;
      stopBg();
    } else {
      bgManualStopRef.current = false;
      playBgForPanelIndex(currentIndex);
    }
  }, [bgPlaying, currentIndex, playBgForPanelIndex, stopBg]);

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

  // Resolve a trigger's audio source URL
  function resolveTriggerAudio(panel: Panel, item: PanelTimelineItem): string | null {
    if (item.type === "narration-audio") return panel.narration_audio_url || null;
    if (item.type === "background-audio") return panel.background_audio_url || null;
    if (item.type === "dialog" && item.ref_id) {
      const dialog = panel.dialogs?.find((d) => d.id === item.ref_id);
      return dialog?.audio_url || null;
    }
    return null;
  }

  // Fire a trigger: pause scroll if pausing, play audio, resume on ended
  const fireTrigger = useCallback((panel: Panel, item: PanelTimelineItem) => {
    const audioUrl = resolveTriggerAudio(panel, item);
    const isPausing = PAUSING_TRIGGER_TYPES.includes(item.type);

    // Background audio: just (re)start playback in the dedicated bg slot
    if (item.type === "background-audio") {
      if (audioUrl) {
        if (bgAudioRef.current) {
          bgAudioRef.current.pause();
        }
        const a = new Audio(audioUrl);
        a.loop = true;
        a.volume = 0.5;
        a.play().catch(() => {});
        bgAudioRef.current = a;
        bgAudioPanelRef.current = panel.id;
      }
      return;
    }

    if (!isPausing) return;

    // Pause auto-scroll while element plays
    if (autoScroll) {
      wasAutoScrollingRef.current = true;
      setAutoScroll(false);
    }

    setFiring({
      panelId: panel.id,
      triggerId: item.id,
      type: item.type,
      label: item.label,
      pausing: true,
    });

    // Play audio if available; resume scroll on ended
    if (audioUrl) {
      // Stop any previous trigger audio
      if (triggerAudioRef.current) {
        triggerAudioRef.current.pause();
      }
      const a = new Audio(audioUrl);
      a.onended = () => {
        triggerAudioRef.current = null;
        setFiring(null);
        if (wasAutoScrollingRef.current) {
          wasAutoScrollingRef.current = false;
          setAutoScroll(true);
        }
      };
      a.onerror = () => {
        triggerAudioRef.current = null;
        setFiring(null);
        if (wasAutoScrollingRef.current) {
          wasAutoScrollingRef.current = false;
          setAutoScroll(true);
        }
      };
      a.play().catch(() => {
        // Autoplay might be blocked; keep paused, user can click resume
      });
      triggerAudioRef.current = a;
    }
    // For ar-trigger or items without audio: stay paused until user clicks resume
  }, [autoScroll]);

  /** Manually resume after a paused trigger (user clicked play/skip) */
  const resumeFromTrigger = useCallback(() => {
    if (triggerAudioRef.current) {
      triggerAudioRef.current.pause();
      triggerAudioRef.current = null;
    }
    setFiring(null);
    if (wasAutoScrollingRef.current) {
      wasAutoScrollingRef.current = false;
      setAutoScroll(true);
    }
  }, []);

  /** Scan all panels and fire any newly-crossed triggers based on viewport playhead at 50vh. */
  const scanTriggers = useCallback(() => {
    if (firing?.pausing) return; // don't fire while already paused

    const playheadY = window.innerHeight / 2;
    let activeBgPanelId: string | null = null;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const el = panelRefs.current[i];
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      // Skip panels not yet near viewport
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
        // If we left this panel in the playhead sense, reset its fired set so
        // re-entering will fire triggers again.
        if (rect.top > window.innerHeight) {
          delete firedRef.current[panel.id];
          delete playheadTimesRef.current[panel.id];
        }
        continue;
      }

      const tl = (panel.timeline_data as PanelTimelineItem[] | undefined) || [];
      if (tl.length === 0) continue;

      const dur = getPanelDuration(panel);
      const height = rect.height;
      if (height <= 0 || dur <= 0) continue;

      // Where is the playhead inside this panel? (in panel-local px)
      const yInside = playheadY - rect.top;
      // Convert to panel-time
      const tNow = Math.max(-0.5, Math.min(dur + 0.5, (yInside / height) * dur));

      const prevT = playheadTimesRef.current[panel.id];
      const fired = firedRef.current[panel.id] || new Set<string>();

      // Determine which panel currently owns the bg-audio slot — the topmost
      // visible panel whose bg-audio is past start.
      const bgItem = tl.find((it) => it.type === "background-audio");
      if (bgItem && tNow >= bgItem.start && tNow <= bgItem.start + bgItem.duration) {
        activeBgPanelId = panel.id;
      }

      // Forward crossing detection: for each trigger, fire if prev < t.start <= now
      // and not already fired.
      if (typeof prevT === "number" && tNow > prevT) {
        for (const item of tl) {
          if (item.type === "panel") continue;
          if (fired.has(item.id)) continue;
          if (item.start > prevT && item.start <= tNow) {
            // Fire!
            fired.add(item.id);
            firedRef.current[panel.id] = fired;
            // Manage bg-audio specially — don't pause
            fireTrigger(panel, item);
            if (PAUSING_TRIGGER_TYPES.includes(item.type)) {
              // Stop scanning further: a pause has been requested
              playheadTimesRef.current[panel.id] = tNow;
              return;
            }
          }
        }
      }

      playheadTimesRef.current[panel.id] = tNow;
    }

    // Stop bg audio if nobody's panel owns it anymore
    if (bgAudioRef.current && bgAudioPanelRef.current && bgAudioPanelRef.current !== activeBgPanelId) {
      bgAudioRef.current.pause();
      bgAudioRef.current = null;
      bgAudioPanelRef.current = null;
    }
  }, [panels, firing, fireTrigger]);

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

  // Track scroll position for current index + scan triggers
  useEffect(() => {
    function onScroll() {
      updateCurrentFromScroll();
      scanTriggers();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    const container = containerRef.current;
    if (container) container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (container) container.removeEventListener("scroll", onScroll);
    };
  }, [updateCurrentFromScroll, scanTriggers]);

  // Auto-scroll animation (top to bottom, stops at end)
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
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const next = cur + scrollSpeedRef.current;
      if (next >= max) {
        setScrollTop(target, max);
        updateCurrentFromScroll();
        scanTriggers();
        setAutoScroll(false);
        return;
      }
      setScrollTop(target, next);
      updateCurrentFromScroll();
      scanTriggers();
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScroll, getScroller, getScrollTop, setScrollTop, getMaxScroll, updateCurrentFromScroll, scanTriggers]);

  // Cleanup audios on unmount
  useEffect(() => {
    return () => {
      triggerAudioRef.current?.pause();
      bgAudioRef.current?.pause();
    };
  }, []);

  const togglePlay = useCallback(() => {
    setAutoScroll((prev) => {
      if (prev) return false;
      const target = getScroller();
      const max = getMaxScroll(target);
      const cur = getScrollTop(target);
      if (max > 0 && cur >= max - 2) {
        setScrollTop(target, 0);
        // Reset all fired triggers since we're starting over
        firedRef.current = {};
        playheadTimesRef.current = {};
      }
      // Starting auto-scroll: if the user hasn't explicitly muted bg audio,
      // begin looping the current panel's bg audio (per user requirement).
      if (!bgManualStopRef.current) {
        playBgForPanelIndex(currentIndex);
      }
      return true;
    });
  }, [getScroller, getScrollTop, setScrollTop, getMaxScroll, playBgForPanelIndex, currentIndex]);

  /** Auto-switch bg audio when the current panel changes — unless the user has
   * explicitly stopped it. The previous panel's bg audio is paused and the new
   * one (if any) starts looping. */
  useEffect(() => {
    if (bgManualStopRef.current) return;
    const next = panels[currentIndex];
    if (!next) return;
    if (!next.background_audio_url) {
      stopBg();
      return;
    }
    if (bgAudioPanelRef.current === next.id) return; // already playing it
    // Only auto-start if either bg is currently playing (panel transition) or
    // auto-scroll is active. This avoids surprising autoplay before the user
    // first interacts with the player.
    if (bgPlaying || autoScroll) {
      playBgForPanelIndex(currentIndex);
    }
  }, [currentIndex, panels, bgPlaying, autoScroll, playBgForPanelIndex, stopBg]);

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
            const dur = getPanelDuration(panel);
            const playedSet = firedRef.current[panel.id];
            const firingForThisPanel = firing?.panelId === panel.id ? firing.triggerId : null;
            return (
              <div
                key={panel.id}
                ref={(el) => { panelRefs.current[i] = el; }}
                className={`relative ${isComplete ? "" : "px-4 sm:px-8 py-4"}`}
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
                {isComplete && (
                  <PanelTimelineOverlay
                    panel={panel}
                    panelDurationSec={dur}
                    firingTriggerId={firingForThisPanel}
                    playedTriggerIds={playedSet}
                  />
                )}
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

      {/* Global red playhead indicator — fixed at viewport 50vh */}
      <PlayheadIndicator
        paused={!!firing?.pausing}
        label={firing?.pausing ? firing.label : undefined}
      />

      {/* Background-audio toggle — sits to the right of the playhead line.
          Only visible if the current panel has a background audio URL. */}
      {panels[currentIndex]?.background_audio_url && (
        <button
          onClick={toggleBgAudio}
          aria-label={bgPlaying ? "Hentikan suara latar" : "Putar suara latar"}
          title={bgPlaying ? "Hentikan suara latar" : "Putar suara latar"}
          className={`fixed right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-2xl transition-all hover:scale-110 active:scale-95 ${
            bgPlaying
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white animate-pulse"
              : "bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-200"
          }`}
          style={{ top: "50vh", transform: "translateY(-50%)" }}
        >
          {bgPlaying ? <Music className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      )}

      {/* Resume button when paused waiting on a trigger */}
      {firing?.pausing && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ top: "calc(50vh + 32px)" }}>
          <button
            onClick={resumeFromTrigger}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow-2xl hover:bg-primary-dark transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            Lanjutkan
          </button>
        </div>
      )}

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
