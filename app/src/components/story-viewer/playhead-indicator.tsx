"use client";

/**
 * PlayheadIndicator — marker minimal di tepi viewport (kiri & kanan) pada
 * y = 50vh untuk menandai posisi "now" timeline. Trigger tetap fire saat
 * lingkaran oranye pada panel melintasi garis ini, namun secara visual
 * tidak ada garis penuh atau ikon play yang melintasi panel.
 *
 * Saat status `paused` aktif (menunggu trigger pausing), marker berkedip dan
 * label opsional muncul menempel di tepi kiri.
 */

interface PlayheadIndicatorProps {
  /** Whether scroll/playback is currently paused waiting for an element */
  paused?: boolean;
  /** Optional label to show next to the playhead */
  label?: string;
}

export function PlayheadIndicator({ paused = false, label }: PlayheadIndicatorProps) {
  const color = paused ? "#f59e0b" : "#ef4444";
  const glow = paused ? "rgba(245, 158, 11, 0.7)" : "rgba(239, 68, 68, 0.7)";

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40"
      style={{ top: "50vh", transform: "translateY(-50%)" }}
      aria-hidden
    >
      {/* Marker tepi kiri — segitiga kecil menunjuk ke dalam */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${paused ? "animate-pulse" : ""}`}
        style={{
          width: 0,
          height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: `12px solid ${color}`,
          filter: `drop-shadow(0 0 6px ${glow})`,
        }}
      />

      {/* Label opsional, hanya tampil saat paused agar tidak mengganggu */}
      {paused && label && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-semibold bg-black/70 text-white rounded-md px-2 py-0.5 shadow">
          {label}
        </div>
      )}

      {/* Marker tepi kanan — segitiga kecil menunjuk ke dalam */}
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 ${paused ? "animate-pulse" : ""}`}
        style={{
          width: 0,
          height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderRight: `12px solid ${color}`,
          filter: `drop-shadow(0 0 6px ${glow})`,
        }}
      />
    </div>
  );
}
