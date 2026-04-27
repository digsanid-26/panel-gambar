"use client";

/**
 * PlayheadIndicator — a fixed red play icon at viewport y = 50vh that marks
 * where the timeline is "now". Triggers fire when an orange circle on a panel
 * crosses this line as the page scrolls.
 */

import { Play, Pause } from "lucide-react";

interface PlayheadIndicatorProps {
  /** Whether scroll/playback is currently paused waiting for an element */
  paused?: boolean;
  /** Optional label to show next to the playhead */
  label?: string;
}

export function PlayheadIndicator({ paused = false, label }: PlayheadIndicatorProps) {
  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex items-center"
      style={{ top: "50vh", transform: "translateY(-50%)" }}
      aria-hidden
    >
      {/* Horizontal red guide line */}
      <div
        className="flex-1 h-px"
        style={{
          background: "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.6) 8%, rgba(239, 68, 68, 0.85) 50%, rgba(239, 68, 68, 0.6) 92%, transparent 100%)",
        }}
      />

      {/* Center marker */}
      <div className="relative shrink-0 mx-2">
        <div
          className={`flex items-center justify-center rounded-full border-2 border-white shadow-2xl ${
            paused ? "animate-pulse" : ""
          }`}
          style={{
            width: "36px",
            height: "36px",
            background: paused
              ? "linear-gradient(135deg, #f59e0b, #d97706)"
              : "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 0 14px rgba(239, 68, 68, 0.7)",
          }}
        >
          {paused ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </div>
        {label && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold bg-black/70 text-white rounded-md px-2 py-0.5 shadow">
            {label}
          </div>
        )}
      </div>

      <div
        className="flex-1 h-px"
        style={{
          background: "linear-gradient(to right, transparent 0%, rgba(239, 68, 68, 0.6) 8%, rgba(239, 68, 68, 0.85) 50%, rgba(239, 68, 68, 0.6) 92%, transparent 100%)",
        }}
      />
    </div>
  );
}
