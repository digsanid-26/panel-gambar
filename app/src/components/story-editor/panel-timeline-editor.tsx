"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PanelTimelineItem, Panel, Dialog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Trash2, GripHorizontal, RotateCcw } from "lucide-react";

interface PanelTimelineEditorProps {
  panel: Panel;
  timelineData: PanelTimelineItem[];
  onChange: (items: PanelTimelineItem[]) => void;
}

const PIXELS_PER_SECOND = 60;
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
  const [dragging, setDragging] = useState<{
    id: string;
    mode: "move" | "resize-left" | "resize-right";
    startX: number;
    origStart: number;
    origDuration: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Total timeline duration = max end of any item
  const totalDuration = Math.max(
    5,
    ...items.map((it) => it.start + it.duration),
    10
  );
  const timelineWidth = totalDuration * PIXELS_PER_SECOND;

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

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, itemId: string, mode: "move" | "resize-left" | "resize-right") => {
      e.preventDefault();
      e.stopPropagation();
      const item = items.find((it) => it.id === itemId);
      if (!item) return;
      setSelectedId(itemId);
      setDragging({
        id: itemId,
        mode,
        startX: e.clientX,
        origStart: item.start,
        origDuration: item.duration,
      });
    },
    [items]
  );

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dt = dx / PIXELS_PER_SECOND;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== dragging.id) return item;

          if (dragging.mode === "move") {
            const newStart = Math.max(0, dragging.origStart + dt);
            return { ...item, start: Math.round(newStart * 4) / 4 }; // snap to 0.25s
          }

          if (dragging.mode === "resize-left") {
            const newStart = Math.max(0, dragging.origStart + dt);
            const endTime = dragging.origStart + dragging.origDuration;
            const newDuration = Math.max(MIN_DURATION, endTime - newStart);
            return {
              ...item,
              start: Math.round(Math.min(newStart, endTime - MIN_DURATION) * 4) / 4,
              duration: Math.round(newDuration * 4) / 4,
            };
          }

          if (dragging.mode === "resize-right") {
            const newDuration = Math.max(MIN_DURATION, dragging.origDuration + dt);
            return { ...item, duration: Math.round(newDuration * 4) / 4 };
          }

          return item;
        })
      );
    }

    function handleMouseUp() {
      setDragging(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

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
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold">
          <Clock className="w-4 h-4 inline mr-1" />
          Timeline Panel
        </label>
        <div className="flex items-center gap-1">
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
                style={{ left: `${i * PIXELS_PER_SECOND}px` }}
              >
                <span className="text-[9px] text-muted ml-1 select-none">{i}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div
          ref={containerRef}
          className="overflow-x-auto"
          style={{ cursor: dragging ? (dragging.mode === "move" ? "grabbing" : "col-resize") : "default" }}
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
                {track.items.map((item) => {
                  const left = item.start * PIXELS_PER_SECOND;
                  const width = Math.max(item.duration * PIXELS_PER_SECOND, 20);
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
        Drag untuk memindahkan · Tarik tepi kiri/kanan untuk mengubah durasi · Klik item untuk memilih
      </p>
    </div>
  );
}
