"use client";

/**
 * AR Scene Viewer — wrapper utama untuk menampilkan satu ARScene.
 *
 * Tugas komponen ini:
 * 1. Deteksi kapabilitas device
 * 2. Tentukan mode rendering: AR marker / 3D-only / error
 * 3. Render UI instruksi, kontrol audio, tombol mode switching
 * 4. Fallback ke 3D-only viewer jika device tidak mendukung AR
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ARScene } from "@/lib/ar/types";
import { detectARCapabilities, type ARCapabilities } from "@/lib/ar/capabilities";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

// Load Three.js-based viewers only on client
const ARModelViewer = dynamic(
  () => import("./ar-model-viewer").then((m) => m.ARModelViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> }
);

const ARMarkerViewer = dynamic(
  () => import("./ar-marker-viewer").then((m) => m.ARMarkerViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> }
);

function ViewerSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-card rounded-xl">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Memuat viewer 3D...</p>
      </div>
    </div>
  );
}

interface ARSceneViewerProps {
  scene: ARScene;
}

export function ARSceneViewer({ scene }: ARSceneViewerProps) {
  const [caps, setCaps] = useState<ARCapabilities | null>(null);
  const [mode, setMode] = useState<"model-only" | "marker-ar">("model-only");
  const [autoRotate, setAutoRotate] = useState(true);
  const [muted, setMuted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detect capabilities once
  useEffect(() => {
    detectARCapabilities().then(setCaps);
  }, []);

  // Autoplay audio for assets with audioTrigger = 'auto'
  useEffect(() => {
    const autoAsset = scene.assets.find((a) => a.audioTrigger === "auto" && a.audioUrl);
    if (!autoAsset?.audioUrl) return;
    const audio = new Audio(autoAsset.audioUrl);
    audio.loop = false;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [scene.id, scene.assets]);

  function toggleAudio() {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
    }
  }

  function toggleMute() {
    if (audioRef.current) audioRef.current.muted = !muted;
    setMuted((m) => !m);
  }

  const canStartMarkerAR =
    scene.type === "marker" &&
    !!scene.markerMindFile &&
    !!caps?.canRunMarkerAR;

  // Render marker AR in fullscreen overlay
  if (mode === "marker-ar" && scene.markerMindFile && scene.markerImage) {
    return (
      <ARMarkerViewer
        mindFileUrl={scene.markerMindFile}
        markerImageUrl={scene.markerImage}
        assets={scene.assets}
        onExit={() => setMode("model-only")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 3D Viewer */}
      <div className="relative w-full aspect-[4/3] md:aspect-video bg-black rounded-xl overflow-hidden border border-border">
        <ARModelViewer assets={scene.assets} autoRotate={autoRotate} />

        {/* Top-left info */}
        <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-sm bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-white pointer-events-none">
          <p className="text-[11px] uppercase tracking-wide text-white/60">
            {scene.type === "marker" ? "AR Marker" : "Model 3D"}
          </p>
          <p className="text-sm font-semibold truncate">{scene.title}</p>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRotate((r) => !r)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur transition-colors"
              title={autoRotate ? "Hentikan putaran" : "Mulai putaran"}
            >
              {autoRotate ? <Square className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            </button>

            {audioRef.current && (
              <>
                <button
                  onClick={toggleAudio}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-background hover:bg-primary-dark transition-colors"
                  title={audioPlaying ? "Jeda audio" : "Putar audio"}
                >
                  {audioPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur transition-colors"
                  title={muted ? "Suarakan" : "Bisukan"}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>

          {canStartMarkerAR && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMode("marker-ar")}
              className="shadow-lg"
            >
              <Camera className="w-4 h-4" />
              Mulai AR
            </Button>
          )}
        </div>
      </div>

      {/* Instruction */}
      {scene.instruction && (
        <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-foreground">{scene.instruction}</p>
        </div>
      )}

      {/* Capability diagnostics — hanya tampil jika AR tidak bisa dijalankan & scene bertipe marker */}
      {scene.type === "marker" && caps && !canStartMarkerAR && (
        <div className="p-3 bg-surface-alt border border-border rounded-xl text-xs text-muted space-y-1">
          <p className="font-semibold text-foreground">Mode AR tidak tersedia</p>
          {!caps.hasCamera && <p>• Device tidak memiliki akses kamera.</p>}
          {!caps.hasWebGL && <p>• Browser tidak mendukung WebGL.</p>}
          {!caps.isMobile && <p>• AR marker optimal di HP/tablet dengan kamera belakang.</p>}
          {!scene.markerMindFile && <p>• Scene ini belum memiliki file marker (.mind).</p>}
          <p className="pt-1 text-foreground">
            Anda masih dapat melihat model dalam tampilan 3D di atas.
          </p>
        </div>
      )}
    </div>
  );
}
