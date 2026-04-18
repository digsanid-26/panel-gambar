"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Panel, Dialog } from "@/lib/types";
import { Upload, Image as ImageIcon, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimplePanelEditorProps {
  panel: Panel;
  onUploadImage: (file: File) => void;
  onDialogPositionChange: (dialogId: string, posX: number, posY: number) => void;
}

function getBubbleClass(style: string) {
  switch (style) {
    case "oval": return "bubble-oval";
    case "kotak": return "bubble-kotak";
    case "awan": return "bubble-awan";
    case "ledakan": return "bubble-ledakan";
    default: return "bubble-kotak";
  }
}

export function SimplePanelEditor({
  panel,
  onUploadImage,
  onDialogPositionChange,
}: SimplePanelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    dialogId: string;
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
  } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedDialog, setSelectedDialog] = useState<string | null>(null);

  // Initialize local positions from panel dialogs
  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    panel.dialogs?.forEach((d) => {
      positions[d.id] = { x: d.position_x, y: d.position_y };
    });
    setLocalPositions(positions);
  }, [panel.dialogs]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, dialog: Dialog) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedDialog(dialog.id);
      const pos = localPositions[dialog.id] || { x: dialog.position_x, y: dialog.position_y };
      setDragging({
        dialogId: dialog.id,
        startX: e.clientX,
        startY: e.clientY,
        origPosX: pos.x,
        origPosY: pos.y,
      });
    },
    [localPositions]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, dialog: Dialog) => {
      e.stopPropagation();
      const touch = e.touches[0];
      setSelectedDialog(dialog.id);
      const pos = localPositions[dialog.id] || { x: dialog.position_x, y: dialog.position_y };
      setDragging({
        dialogId: dialog.id,
        startX: touch.clientX,
        startY: touch.clientY,
        origPosX: pos.x,
        origPosY: pos.y,
      });
    },
    [localPositions]
  );

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragging.origPosX + dx));
      const newY = Math.max(0, Math.min(100, dragging.origPosY + dy));
      setLocalPositions((prev) => ({
        ...prev,
        [dragging.dialogId]: { x: Math.round(newX), y: Math.round(newY) },
      }));
    }

    function handleTouchMove(e: TouchEvent) {
      if (!dragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((touch.clientX - dragging.startX) / rect.width) * 100;
      const dy = ((touch.clientY - dragging.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragging.origPosX + dx));
      const newY = Math.max(0, Math.min(100, dragging.origPosY + dy));
      setLocalPositions((prev) => ({
        ...prev,
        [dragging.dialogId]: { x: Math.round(newX), y: Math.round(newY) },
      }));
    }

    function handleEnd() {
      if (!dragging) return;
      const pos = localPositions[dragging.dialogId];
      if (pos) {
        onDialogPositionChange(dragging.dialogId, pos.x, pos.y);
      }
      setDragging(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, localPositions, onDialogPositionChange]);

  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        <ImageIcon className="w-4 h-4 inline mr-1" />
        Editor Panel
      </label>

      {/* Live preview container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[3/2] rounded-xl border-2 border-border overflow-hidden"
        style={{ backgroundColor: panel.background_color || "#f0f9ff" }}
        onClick={() => setSelectedDialog(null)}
      >
        {/* Panel image */}
        {panel.image_url ? (
          <>
            <img
              src={panel.image_url}
              alt="Panel"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Change image button */}
            <label className="absolute bottom-2 right-2 cursor-pointer z-30">
              <Button variant="outline" size="sm" className="bg-surface-card/90 backdrop-blur-sm" type="button">
                <Upload className="w-4 h-4" />
                Ganti
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadImage(f);
                }}
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-primary/5 transition-colors">
            <Upload className="w-8 h-8 text-muted mb-2" />
            <span className="text-sm text-muted">Klik untuk upload gambar</span>
            <span className="text-xs text-muted mt-1">JPG, PNG, WebP · Max 5MB</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadImage(f);
              }}
            />
          </label>
        )}

        {/* Draggable dialog bubbles */}
        {panel.dialogs?.map((dialog) => {
          const pos = localPositions[dialog.id] || { x: dialog.position_x, y: dialog.position_y };
          const isSelected = selectedDialog === dialog.id;
          const isDragging = dragging?.dialogId === dialog.id;

          return (
            <div
              key={dialog.id}
              className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-3 py-2 max-w-[180px] select-none z-20 transition-shadow ${
                isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-lg"
              } ${isDragging ? "cursor-grabbing opacity-90" : "cursor-grab"}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                borderColor: dialog.character_color,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={(e) => handleMouseDown(e, dialog)}
              onTouchStart={(e) => handleTouchStart(e, dialog)}
              onClick={(e) => { e.stopPropagation(); setSelectedDialog(dialog.id); }}
            >
              {/* Drag handle indicator */}
              {isSelected && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                  <Move className="w-2.5 h-2.5" />
                  Drag
                </div>
              )}
              <p className="text-[10px] font-bold mb-0.5" style={{ color: dialog.character_color }}>
                {dialog.character_name}
              </p>
              <p className="text-xs leading-snug line-clamp-3">{dialog.text}</p>
              {isSelected && (
                <p className="text-[9px] text-muted mt-1">
                  Posisi: {pos.x}%, {pos.y}%
                </p>
              )}
            </div>
          );
        })}

        {/* Grid overlay when dragging */}
        {dragging && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Horizontal guides */}
            {[25, 50, 75].map((pct) => (
              <div key={`h-${pct}`} className="absolute left-0 right-0 border-t border-primary/20" style={{ top: `${pct}%` }} />
            ))}
            {/* Vertical guides */}
            {[25, 50, 75].map((pct) => (
              <div key={`v-${pct}`} className="absolute top-0 bottom-0 border-l border-primary/20" style={{ left: `${pct}%` }} />
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-[10px] text-muted mt-1.5">
        Drag bubble dialog untuk memindahkan posisi · Klik bubble untuk memilih · Posisi otomatis tersimpan
      </p>
    </div>
  );
}
