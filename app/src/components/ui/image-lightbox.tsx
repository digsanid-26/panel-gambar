"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const lastTouchDist = useRef(0);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  function clampScale(s: number) { return Math.min(5, Math.max(1, s)); }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = clampScale(scale * (1 - e.deltaY * 0.001));
    if (next === 1) setOffset({ x: 0, y: 0 });
    setScale(next);
  }

  function handleDoubleClick() {
    const next = scale > 1 ? 1 : 2.5;
    setScale(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }
  function handleMouseUp() { setDragging(false); }

  // Pinch zoom
  function getTouchDist(e: React.TouchEvent) {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) lastTouchDist.current = getTouchDist(e);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    const dist = getTouchDist(e);
    const factor = dist / (lastTouchDist.current || dist);
    lastTouchDist.current = dist;
    const next = clampScale(scale * factor);
    if (next === 1) setOffset({ x: 0, y: 0 });
    setScale(next);
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top hint */}
      <p className="absolute top-3 left-1/2 -translate-x-1/2 text-white/40 text-[11px] pointer-events-none select-none whitespace-nowrap">
        Scroll / pinch untuk zoom · Double-click untuk zoom · Klik luar untuk tutup
      </p>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        title="Tutup (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image container */}
      <div
        className="relative flex items-center justify-center"
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <img
          src={src}
          alt={alt ?? ""}
          draggable={false}
          className="select-none"
          style={{
            maxWidth: "92vw",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: "12px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transition: dragging ? "none" : "transform 0.2s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
        <button
          onClick={() => { const n = clampScale(scale - 0.5); setScale(n); if (n === 1) setOffset({ x: 0, y: 0 }); }}
          className="p-1 text-white/60 hover:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white/60 text-xs min-w-[3.5rem] text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(clampScale(scale + 0.5))}
          className="p-1 text-white/60 hover:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
