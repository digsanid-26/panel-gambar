"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Panel, Dialog, NarrationOverlay } from "@/lib/types";
import { Upload, Image as ImageIcon, Move, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimplePanelEditorProps {
  panel: Panel;
  onUploadImage: (file: File) => void;
  onDialogPositionChange: (dialogId: string, posX: number, posY: number) => void;
  onNarrationOverlayChange: (overlay: NarrationOverlay) => void;
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

const DEFAULT_NARRATION_OVERLAY: NarrationOverlay = {
  position_x: 50,
  position_y: 85,
  font_color: "#ffffff",
  bg_color: "#000000",
  opacity: 0.75,
  font_size: 14,
  max_width: 80,
};

type DragTarget = { type: "dialog"; id: string } | { type: "narration" };

export function SimplePanelEditor({
  panel,
  onUploadImage,
  onDialogPositionChange,
  onNarrationOverlayChange,
}: SimplePanelEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    target: DragTarget;
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
  } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selected, setSelected] = useState<DragTarget | null>(null);

  // Narration overlay local state
  const [narOverlay, setNarOverlay] = useState<NarrationOverlay>(
    panel.narration_overlay || DEFAULT_NARRATION_OVERLAY
  );
  const [showNarStyle, setShowNarStyle] = useState(false);

  // Sync from panel prop
  useEffect(() => {
    if (panel.narration_overlay) setNarOverlay(panel.narration_overlay);
  }, [panel.narration_overlay]);

  // Initialize local positions from panel dialogs
  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    panel.dialogs?.forEach((d) => {
      positions[d.id] = { x: d.position_x, y: d.position_y };
    });
    setLocalPositions(positions);
  }, [panel.dialogs]);

  function getTargetKey(t: DragTarget): string {
    return t.type === "narration" ? "__narration__" : t.id;
  }

  const startDrag = useCallback(
    (clientX: number, clientY: number, target: DragTarget) => {
      setSelected(target);
      let origX: number, origY: number;
      if (target.type === "narration") {
        origX = narOverlay.position_x;
        origY = narOverlay.position_y;
      } else {
        const pos = localPositions[target.id];
        const dialog = panel.dialogs?.find((d) => d.id === target.id);
        origX = pos?.x ?? dialog?.position_x ?? 50;
        origY = pos?.y ?? dialog?.position_y ?? 20;
      }
      setDragging({ target, startX: clientX, startY: clientY, origPosX: origX, origPosY: origY });
    },
    [localPositions, narOverlay, panel.dialogs]
  );

  useEffect(() => {
    if (!dragging) return;

    function onMove(clientX: number, clientY: number) {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((clientX - dragging.startX) / rect.width) * 100;
      const dy = ((clientY - dragging.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragging.origPosX + dx));
      const newY = Math.max(0, Math.min(100, dragging.origPosY + dy));

      if (dragging.target.type === "narration") {
        setNarOverlay((prev) => ({ ...prev, position_x: Math.round(newX), position_y: Math.round(newY) }));
      } else {
        setLocalPositions((prev) => ({
          ...prev,
          [dragging.target.type === "dialog" ? dragging.target.id : ""]: { x: Math.round(newX), y: Math.round(newY) },
        }));
      }
    }

    function handleMouseMove(e: MouseEvent) { onMove(e.clientX, e.clientY); }
    function handleTouchMove(e: TouchEvent) { onMove(e.touches[0].clientX, e.touches[0].clientY); }

    function handleEnd() {
      if (!dragging) return;
      if (dragging.target.type === "narration") {
        onNarrationOverlayChange({ ...narOverlay });
      } else {
        const pos = localPositions[dragging.target.id];
        if (pos) onDialogPositionChange(dragging.target.id, pos.x, pos.y);
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
  }, [dragging, localPositions, narOverlay, onDialogPositionChange, onNarrationOverlayChange]);

  const isNarrationSelected = selected?.type === "narration";

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
        onClick={() => { setSelected(null); setShowNarStyle(false); }}
      >
        {/* Panel image */}
        {panel.image_url ? (
          <>
            <img src={panel.image_url} alt="Panel" className="w-full h-full object-cover" draggable={false} />
            <label className="absolute bottom-2 right-2 cursor-pointer z-30">
              <Button variant="outline" size="sm" className="bg-surface-card/90 backdrop-blur-sm" type="button">
                <Upload className="w-4 h-4" /> Ganti
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(f); }} />
            </label>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-primary/5 transition-colors">
            <Upload className="w-8 h-8 text-muted mb-2" />
            <span className="text-sm text-muted">Klik untuk upload gambar</span>
            <span className="text-xs text-muted mt-1">JPG, PNG, WebP · Max 5MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImage(f); }} />
          </label>
        )}

        {/* Draggable dialog bubbles */}
        {panel.dialogs?.map((dialog) => {
          const pos = localPositions[dialog.id] || { x: dialog.position_x, y: dialog.position_y };
          const isSel = selected?.type === "dialog" && selected.id === dialog.id;
          const isDrag = dragging?.target.type === "dialog" && dragging.target.id === dialog.id;
          return (
            <div
              key={dialog.id}
              className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-3 py-2 max-w-[180px] select-none z-20 transition-shadow ${
                isSel ? "ring-2 ring-primary shadow-lg" : "hover:shadow-lg"
              } ${isDrag ? "cursor-grabbing opacity-90" : "cursor-grab"}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, borderColor: dialog.character_color, transform: "translate(-50%, -50%)" }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientX, e.clientY, { type: "dialog", id: dialog.id }); }}
              onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, { type: "dialog", id: dialog.id }); }}
              onClick={(e) => { e.stopPropagation(); setSelected({ type: "dialog", id: dialog.id }); setShowNarStyle(false); }}
            >
              {isSel && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                  <Move className="w-2.5 h-2.5" /> Drag
                </div>
              )}
              <p className="text-[10px] font-bold mb-0.5" style={{ color: dialog.character_color }}>{dialog.character_name}</p>
              <p className="text-xs leading-snug line-clamp-3">{dialog.text}</p>
              {isSel && <p className="text-[9px] text-muted mt-1">Posisi: {pos.x}%, {pos.y}%</p>}
            </div>
          );
        })}

        {/* Draggable narration overlay (inside panel) */}
        {panel.narration_text && (
          <div
            className={`absolute select-none z-20 rounded-lg px-3 py-2 transition-shadow ${
              isNarrationSelected ? "ring-2 ring-accent shadow-lg" : "hover:shadow-lg"
            } ${dragging?.target.type === "narration" ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              left: `${narOverlay.position_x}%`,
              top: `${narOverlay.position_y}%`,
              transform: "translate(-50%, -50%)",
              color: narOverlay.font_color,
              backgroundColor: narOverlay.bg_color,
              opacity: narOverlay.opacity,
              fontSize: `${narOverlay.font_size || 14}px`,
              maxWidth: `${narOverlay.max_width || 80}%`,
            }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startDrag(e.clientX, e.clientY, { type: "narration" }); }}
            onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, { type: "narration" }); }}
            onClick={(e) => { e.stopPropagation(); setSelected({ type: "narration" }); setShowNarStyle(true); }}
          >
            {isNarrationSelected && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                <Type className="w-2.5 h-2.5" /> Narasi
              </div>
            )}
            <p className="text-sm leading-relaxed line-clamp-4">{panel.narration_text}</p>
            {isNarrationSelected && (
              <p className="text-[9px] mt-1" style={{ opacity: 0.7 }}>Posisi: {narOverlay.position_x}%, {narOverlay.position_y}%</p>
            )}
          </div>
        )}

        {/* Grid overlay when dragging */}
        {dragging && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {[25, 50, 75].map((pct) => (
              <div key={`h-${pct}`} className="absolute left-0 right-0 border-t border-primary/20" style={{ top: `${pct}%` }} />
            ))}
            {[25, 50, 75].map((pct) => (
              <div key={`v-${pct}`} className="absolute top-0 bottom-0 border-l border-primary/20" style={{ left: `${pct}%` }} />
            ))}
          </div>
        )}
      </div>

      {/* Narration style controls */}
      {showNarStyle && panel.narration_text && (
        <div className="mt-2 p-3 bg-surface-alt rounded-xl border border-border space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1"><Type className="w-3 h-3" /> Styling Narasi</p>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-muted block mb-0.5">Warna Font</label>
              <input type="color" value={narOverlay.font_color} onChange={(e) => {
                const v = { ...narOverlay, font_color: e.target.value };
                setNarOverlay(v); onNarrationOverlayChange(v);
              }} className="w-full h-8 rounded border border-border cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-0.5">Warna Latar</label>
              <input type="color" value={narOverlay.bg_color} onChange={(e) => {
                const v = { ...narOverlay, bg_color: e.target.value };
                setNarOverlay(v); onNarrationOverlayChange(v);
              }} className="w-full h-8 rounded border border-border cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-0.5">Opacity</label>
              <input type="range" min="0.1" max="1" step="0.05" value={narOverlay.opacity} onChange={(e) => {
                const v = { ...narOverlay, opacity: parseFloat(e.target.value) };
                setNarOverlay(v); onNarrationOverlayChange(v);
              }} className="w-full h-8" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-0.5">Font Size</label>
              <input type="number" min="10" max="32" value={narOverlay.font_size || 14} onChange={(e) => {
                const v = { ...narOverlay, font_size: parseInt(e.target.value) || 14 };
                setNarOverlay(v); onNarrationOverlayChange(v);
              }} className="w-full h-8 text-xs rounded border border-border px-2" />
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted mt-1.5">
        Drag elemen untuk memindahkan posisi · Klik narasi untuk styling · Posisi otomatis tersimpan
      </p>
    </div>
  );
}
