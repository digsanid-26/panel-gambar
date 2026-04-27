"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface ScrollSpeedDialProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number; // px per frame
  onSpeedChange: (speed: number) => void;
  minSpeed?: number;
  maxSpeed?: number;
  visible?: boolean;
}

const SIZE = 96; // outer dial container
const RADIUS = 40; // ring radius
const KNOB_SIZE = 14;
const ARC_START = -135; // degrees (0° = up); knob position for minSpeed
const ARC_LEN = 270; // total usable arc

function angleToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

export function ScrollSpeedDial({
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  minSpeed = 0.3,
  maxSpeed = 6,
  visible = true,
}: ScrollSpeedDialProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const speedToAngle = useCallback(
    (s: number) => {
      const t = Math.max(0, Math.min(1, (s - minSpeed) / (maxSpeed - minSpeed)));
      return ARC_START + t * ARC_LEN;
    },
    [minSpeed, maxSpeed]
  );

  const angleToSpeed = useCallback(
    (angleDeg: number) => {
      // Normalize angle into [-180, 180]
      let a = angleDeg;
      while (a > 180) a -= 360;
      while (a < -180) a += 360;
      const min = ARC_START;
      const max = ARC_START + ARC_LEN; // 135
      const clamped = Math.max(min, Math.min(max, a));
      const t = (clamped - min) / ARC_LEN;
      return minSpeed + t * (maxSpeed - minSpeed);
    },
    [minSpeed, maxSpeed]
  );

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // 0° = up, clockwise positive
      const a = Math.atan2(dx, -dy) * (180 / Math.PI);
      onSpeedChange(angleToSpeed(a));
    },
    [angleToSpeed, onSpeedChange]
  );

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      handlePointer(e.clientX, e.clientY);
    }
    function onTouch(e: TouchEvent) {
      if (e.touches[0]) {
        e.preventDefault();
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
    function onEnd() {
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouch, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onEnd);
    };
  }, [dragging, handlePointer]);

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Arc track
  const startPt = angleToXY(cx, cy, RADIUS, ARC_START);
  const endPt = angleToXY(cx, cy, RADIUS, ARC_START + ARC_LEN);
  const trackPath = `M ${startPt.x} ${startPt.y} A ${RADIUS} ${RADIUS} 0 ${
    ARC_LEN > 180 ? 1 : 0
  } 1 ${endPt.x} ${endPt.y}`;

  // Progress arc (filled portion)
  const currentAngle = speedToAngle(speed);
  const progEnd = angleToXY(cx, cy, RADIUS, currentAngle);
  const progLargeArc = currentAngle - ARC_START > 180 ? 1 : 0;
  const progPath = `M ${startPt.x} ${startPt.y} A ${RADIUS} ${RADIUS} 0 ${progLargeArc} 1 ${progEnd.x} ${progEnd.y}`;

  // Knob position
  const knob = angleToXY(cx, cy, RADIUS, currentAngle);

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-6 right-6 z-50 select-none transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ width: SIZE, height: SIZE, touchAction: "none" }}
    >
      <svg width={SIZE} height={SIZE} className="absolute inset-0 pointer-events-none">
        {/* Track */}
        <path
          d={trackPath}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress (only show when playing for clarity) */}
        <path
          d={progPath}
          className="text-primary"
          stroke="currentColor"
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      {/* Knob (draggable) */}
      <div
        role="slider"
        aria-label="Kecepatan auto-scroll"
        aria-valuemin={minSpeed}
        aria-valuemax={maxSpeed}
        aria-valuenow={Number(speed.toFixed(2))}
        className={`absolute rounded-full bg-white border-2 border-primary shadow-md ${
          dragging ? "cursor-grabbing scale-110" : "cursor-grab"
        } transition-transform`}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          left: knob.x - KNOB_SIZE / 2,
          top: knob.y - KNOB_SIZE / 2,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        title={`Kecepatan: ${speed.toFixed(1)}`}
      />

      {/* Center play / pause button */}
      <button
        onClick={onTogglePlay}
        className="absolute rounded-full shadow-lg flex items-center justify-center bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all"
        style={{
          width: 56,
          height: 56,
          left: (SIZE - 56) / 2,
          top: (SIZE - 56) / 2,
        }}
        title={isPlaying ? "Stop auto-scroll" : "Mulai auto-scroll"}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 fill-current" />
        ) : (
          <Play className="w-6 h-6 fill-current ml-0.5" />
        )}
      </button>

      {/* Speed badge */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-surface-card border border-border px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
        {speed.toFixed(1)}x
      </div>
    </div>
  );
}
