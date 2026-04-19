"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PanelTimelineItem, Panel, Dialog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Trash2, GripHorizontal, RotateCcw, ZoomIn, ZoomOut, Maximize2, Play, Square } from "lucide-react";

interface PanelTimelineEditorProps {
  panel: Panel;
  timelineData: PanelTimelineItem[];
  onChange: (items: PanelTimelineItem[]) => void;
}

const DEFAULT_PPS = 60; // default pixels per second
const MIN_PPS = 10;
const MAX_PPS = 120;
const MIN_DURATION = 0.5;
const SNAP_THRESHOLD = 0.25; // seconds

const TYPE_COLORS: Record<string, string> = {
  panel: "#6366f1",
  "narration-audio": "#22c55e",
  "background-audio": "#14b8a6",
  dialog: "#f59e0b",
  image: "#3b82f6",
  bubble: "#ec4899",
};

const TYPE_LABELS: Record<string, string> = {
  panel: "Durasi Panel",
  "narration-audio": "Audio Narasi",
  "background-audio": "Suara Latar",
  dialog: "Dialog",
  image: "Gambar",
  bubble: "Bubble",
};

function generateId() {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0 ? `${m}:${parseFloat(s).toFixed(1).padStart(4, "0")}` : `${parseFloat(s).toFixed(1)}s`;
}

/** Build default timeline items from panel content */
function buildDefaultTimeline(panel: Panel): PanelTimelineItem[] {
  const items: PanelTimelineItem[] = [];
  let t = 0;

  // Base panel duration
  items.push({
    id: generateId(),
    type: "panel",
    label: "Durasi Panel",
    start: 0,
    duration: 5,
    color: TYPE_COLORS.panel,
  });

  // Narration audio
  if (panel.narration_audio_url) {
    items.push({
      id: generateId(),
      type: "narration-audio",
      label: "Audio Narasi",
      start: 0.5,
      duration: 3,
      color: TYPE_COLORS["narration-audio"],
    });
  }

  // Background audio
  if (panel.background_audio_url) {
    items.push({
      id: generateId(),
      type: "background-audio",
      label: "Suara Latar",
      start: 0,
      duration: 5,
      color: TYPE_COLORS["background-audio"],
    });
  }

  // Dialogs
  t = 1;
  panel.dialogs?.forEach((dialog, i) => {
    items.push({
      id: generateId(),
      type: "dialog",
      label: `${dialog.character_name}: "${dialog.text.slice(0, 20)}${dialog.text.length > 20 ? "..." : ""}"`,
      ref_id: dialog.id,
      start: t,
      duration: 2,
      color: dialog.character_color || TYPE_COLORS.dialog,
    });
    t += 2.5;
  });

  // Image appearance
  if (panel.image_url) {
    items.push({
      id: generateId(),
      type: "image",
      label: "Gambar Panel",
      start: 0,
      duration: 5,
      color: TYPE_COLORS.image,
    });
  }

  return items;
}

export function PanelTimelineEditor({ panel, timelineData, onChange }: PanelTimelineEditorProps) {
  const [items, setItems] = useState<PanelTimelineItem[]>(
    timelineData.length > 0 ? timelineData : buildDefaultTimeline(panel)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pps, setPps] = useState(DEFAULT_PPS); // pixels per second (zoom level)
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"move" | "resize-left" | "resize-right">("move");

  // Preview playback state
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const previewRafRef = useRef<number>(0);
  const previewAudiosRef = useRef<HTMLAudioElement[]>([]);
  const previewStartRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const ppsRef = useRef(pps);
  ppsRef.current = pps;

  // Stable drag ref — never triggers re-renders during drag
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize-left" | "resize-right";
    startX: number;
    origStart: number;
    origDuration: number;
  } | null>(null);

  // Sync with external timelineData changes (e.g. audio upload adds entry)
  useEffect(() => {
    if (timelineData.length > 0) {
      setItems(timelineData);
    }
  }, [timelineData]);

  // Total timeline duration = max end of any item
  const totalDuration = Math.max(
    5,
    ...items.map((it) => it.start + it.duration),
    10
  );
  const timelineWidth = totalDuration * pps;

  // Fit all items within visible area
  function fitAll() {
    const containerWidth = trackAreaRef.current?.clientWidth || 400;
    const idealPps = Math.max(MIN_PPS, Math.min(MAX_PPS, Math.floor(containerWidth / totalDuration)));
    setPps(idealPps);
  }

  // Persist changes
  useEffect(() => {
    onChange(items);
  }, [items]);

  // Group items by type for layered display
  const trackOrder: PanelTimelineItem["type"][] = [
    "panel",
    "image",
    "narration-audio",
    "background-audio",
    "dialog",
    "bubble",
  ];

  const tracks = trackOrder
    .map((type) => ({
      type,
      items: items.filter((it) => it.type === type),
    }))
    .filter((t) => t.items.length > 0);

  // --- Drag handlers using ref (no re-render jitter) ---
  function handleMouseDown(e: React.MouseEvent, itemId: string, mode: "move" | "resize-left" | "resize-right") {
    e.preventDefault();
    e.stopPropagation();
    // Read directly from current items state
    setItems((prev) => {
      const item = prev.find((it) => it.id === itemId);
      if (item) {
        dragRef.current = {
          id: itemId,
          mode,
          startX: e.clientX,
          origStart: item.start,
          origDuration: item.duration,
        };
      }
      return prev; // no change
    });
    setSelectedId(itemId);
    setIsDragging(true);
    setDragMode(mode);
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dt = dx / ppsRef.current;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== drag.id) return item;

          if (drag.mode === "move") {
            const newStart = Math.max(0, drag.origStart + dt);
            return { ...item, start: Math.round(newStart * 4) / 4 };
          }

          if (drag.mode === "resize-left") {
            const newStart = Math.max(0, drag.origStart + dt);
            const endTime = drag.origStart + drag.origDuration;
            const newDuration = Math.max(MIN_DURATION, endTime - newStart);
            return {
              ...item,
              start: Math.round(Math.min(newStart, endTime - MIN_DURATION) * 4) / 4,
              duration: Math.round(newDuration * 4) / 4,
            };
          }

          if (drag.mode === "resize-right") {
            const newDuration = Math.max(MIN_DURATION, drag.origDuration + dt);
            return { ...item, duration: Math.round(newDuration * 4) / 4 };
          }

          return item;
        })
      );
    }

    function handleMouseUp() {
      dragRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // runs once, reads from refs

  // --- Preview playback ---
  function stopPreview() {
    cancelAnimationFrame(previewRafRef.current);
    previewAudiosRef.current.forEach((a) => { a.pause(); a.src = ""; });
    previewAudiosRef.current = [];
    setPreviewTime(null);
  }

  function startPreview() {
    stopPreview();

    const panelItem = items.find((it) => it.type === "panel");
    const duration = panelItem ? panelItem.duration : totalDuration;

    // Collect audio items with their source URLs
    const audioSchedule: { start: number; end: number; src: string }[] = [];

    items.forEach((it) => {
      if (it.type === "narration-audio" && panel.narration_audio_url) {
        audioSchedule.push({ start: it.start, end: it.start + it.duration, src: panel.narration_audio_url });
      }
      if (it.type === "background-audio" && panel.background_audio_url) {
        audioSchedule.push({ start: it.start, end: it.start + it.duration, src: panel.background_audio_url });
      }
      if (it.type === "dialog" && it.ref_id) {
        const dialog = panel.dialogs?.find((d) => d.id === it.ref_id);
        if (dialog?.audio_url) {
          audioSchedule.push({ start: it.start, end: it.start + it.duration, src: dialog.audio_url });
        }
      }
    });

    // Pre-create Audio elements
    const audioEntries = audioSchedule.map((s) => {
      const audio = new Audio(s.src);
      audio.preload = "auto";
      return { ...s, audio, started: false };
    });
    previewAudiosRef.current = audioEntries.map((e) => e.audio);

    const t0 = performance.now();
    previewStartRef.current = t0;

    function tick() {
      const elapsed = (performance.now() - t0) / 1000;
      if (elapsed >= duration) {
        stopPreview();
        return;
      }
      setPreviewTime(elapsed);

      // Start/stop audio elements based on elapsed time
      audioEntries.forEach((entry) => {
        if (elapsed >= entry.start && elapsed < entry.end && !entry.started) {
          entry.audio.currentTime = 0;
          entry.audio.play().catch(() => {});
          entry.started = true;
        }
        if (elapsed >= entry.end && entry.started) {
          entry.audio.pause();
        }
      });

      previewRafRef.current = requestAnimationFrame(tick);
    }

    previewRafRef.current = requestAnimationFrame(tick);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPreview();
  }, []);

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function resetTimeline() {
    const defaults = buildDefaultTimeline(panel);
    setItems(defaults);
    setSelectedId(null);
  }

  function addBubbleTrack() {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "bubble",
        label: "Bubble Baru",
        start: 0,
        duration: 2,
        color: TYPE_COLORS.bubble,
      },
    ]);
  }

  const selectedItem = items.find((it) => it.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <label className="block text-sm font-semibold shrink-0">
          <Clock className="w-4 h-4 inline mr-1" />
          Timeline Panel
        </label>
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            onClick={() => setPps((v) => Math.max(MIN_PPS, v - 10))}
            className="p-1 text-muted hover:text-foreground rounded transition-colors"
            title="Perkecil"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={MIN_PPS}
            max={MAX_PPS}
            step={5}
            value={pps}
            onChange={(e) => setPps(Number(e.target.value))}
            className="w-16 h-1 accent-primary cursor-pointer"
            title={`Zoom: ${pps}px/detik`}
          />
          <button
            onClick={() => setPps((v) => Math.min(MAX_PPS, v + 10))}
            className="p-1 text-muted hover:text-foreground rounded transition-colors"
            title="Perbesar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fitAll}
            className="p-1 text-muted hover:text-foreground rounded transition-colors"
            title="Muat semua"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] text-muted w-8 text-center">{pps}px/s</span>
          <div className="w-px h-4 bg-border mx-0.5" />
          {/* Preview play/stop */}
          {previewTime !== null ? (
            <button
              onClick={stopPreview}
              className="p-1 text-danger hover:text-danger/80 rounded transition-colors"
              title="Stop Preview"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={startPreview}
              className="p-1 text-primary hover:text-primary/80 rounded transition-colors"
              title="Play Preview"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {previewTime !== null && (
            <span className="text-[9px] text-primary font-mono w-10 text-center">{formatTime(previewTime)}</span>
          )}
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="sm" onClick={addBubbleTrack} title="Tambah track bubble">
            <Plus className="w-3.5 h-3.5" />
            Bubble
          </Button>
          <Button variant="ghost" size="sm" onClick={resetTimeline} title="Reset ke default">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        {/* Time ruler */}
        <div className="relative h-6 bg-surface-alt border-b border-border overflow-x-auto" style={{ width: "100%" }}>
          <div className="relative h-full" style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-border/50"
                style={{ left: `${i * pps}px` }}
              >
                <span className="text-[9px] text-muted ml-1 select-none">{i}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div
          ref={(el) => { containerRef.current = el; trackAreaRef.current = el; }}
          className="overflow-x-auto"
          style={{ cursor: isDragging ? (dragMode === "move" ? "grabbing" : "col-resize") : "default" }}
        >
          <div style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
            {tracks.map((track) => (
              <div key={track.type} className="relative border-b border-border last:border-b-0" style={{ height: "40px" }}>
                {/* Track label */}
                <div className="absolute left-1 top-1 z-10">
                  <span className="text-[9px] text-muted font-medium bg-surface/80 px-1 rounded select-none">
                    {TYPE_LABELS[track.type] || track.type}
                  </span>
                </div>

                {/* Items in this track */}
                {/* Playhead indicator */}
                {previewTime !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-40 pointer-events-none"
                    style={{ left: `${previewTime * pps}px` }}
                  />
                )}

                {track.items.map((item) => {
                  const left = item.start * pps;
                  const width = Math.max(item.duration * pps, 20);
                  const isSelected = selectedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`absolute top-1 bottom-1 rounded-lg flex items-center overflow-hidden cursor-grab select-none transition-shadow ${
                        isSelected ? "ring-2 ring-white shadow-lg z-20" : "z-10 hover:shadow-md"
                      }`}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: item.color + (isSelected ? "" : "cc"),
                      }}
                      onMouseDown={(e) => handleMouseDown(e, item.id, "move")}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-30"
                        onMouseDown={(e) => handleMouseDown(e, item.id, "resize-left")}
                      />

                      {/* Content */}
                      <div className="flex-1 px-2 min-w-0">
                        <p className="text-[10px] text-white font-medium truncate leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[8px] text-white/70 leading-tight">
                          {formatTime(item.start)} — {formatTime(item.start + item.duration)}
                        </p>
                      </div>

                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-30"
                        onMouseDown={(e) => handleMouseDown(e, item.id, "resize-right")}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected item info */}
        {selectedItem && (
          <div className="flex items-center gap-3 px-3 py-2 border-t border-border bg-surface-alt text-xs">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: selectedItem.color }}
            />
            <span className="font-medium truncate">{selectedItem.label}</span>
            <span className="text-muted">
              mulai: {formatTime(selectedItem.start)} · durasi: {formatTime(selectedItem.duration)}
            </span>
            <span className="text-muted">
              total: {formatTime(selectedItem.start + selectedItem.duration)}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {selectedItem.type !== "panel" && (
                <button
                  onClick={() => deleteItem(selectedItem.id)}
                  className="p-1 text-muted hover:text-danger rounded transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted mt-1.5">
        Drag untuk memindahkan · Tarik tepi kiri/kanan untuk mengubah durasi · Klik item untuk memilih · Gunakan slider zoom atau tombol <strong>Muat Semua</strong> untuk menyesuaikan tampilan
      </p>
    </div>
  );
}
