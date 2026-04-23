"use client";

/**
 * AR Marker Viewer — image tracking AR menggunakan MindAR + Three.js.
 *
 * Implementasi menggunakan CDN-loader untuk MindAR (bukan import webpack)
 * untuk menghindari konflik bundling (lihat lib/ar/mindar-loader.ts).
 * Three.js (dari bundle aplikasi) dipakai hanya untuk GLTFLoader;
 * MindAR membawa versi Three.js internalnya sendiri untuk rendering.
 */

import { useEffect, useRef, useState } from "react";
import type { ARAsset } from "@/lib/ar/types";
import { loadMindAR, type MindARThreeInstance } from "@/lib/ar/mindar-loader";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ARMarkerViewerProps {
  mindFileUrl: string;
  markerImageUrl: string;
  assets: ARAsset[];
  onExit?: () => void;
}

export function ARMarkerViewer({
  mindFileUrl,
  markerImageUrl,
  assets,
  onExit,
}: ARMarkerViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "tracking" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !mindFileUrl) return;

    let instance: MindARThreeInstance | null = null;
    let cancelled = false;

    async function init() {
      try {
        const MindARImage = await loadMindAR();
        if (cancelled || !containerRef.current) return;

        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

        instance = new MindARImage.MindARThree({
          container: containerRef.current,
          imageTargetSrc: mindFileUrl,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });

        const { renderer, scene, camera } = instance;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(2, 5, 3);
        scene.add(ambient);
        scene.add(directional);

        // Attach assets to anchor 0
        const anchor = instance.addAnchor(0);
        const loader = new GLTFLoader();

        for (const asset of assets) {
          await new Promise<void>((resolve) => {
            loader.load(
              asset.src,
              (gltf: { scene: { position: { set: (x: number, y: number, z: number) => void }; rotation: { set: (x: number, y: number, z: number) => void }; scale: { set: (x: number, y: number, z: number) => void } } }) => {
                const model = gltf.scene;
                const t = asset.transform;
                if (t?.position) model.position.set(t.position[0], t.position[1], t.position[2]);
                if (t?.rotation) model.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
                if (t?.scale !== undefined) {
                  const s = typeof t.scale === "number" ? [t.scale, t.scale, t.scale] : t.scale;
                  model.scale.set(s[0], s[1], s[2]);
                }
                anchor.group.add(model);
                resolve();
              },
              undefined,
              (err: unknown) => {
                console.error("Gagal memuat GLB:", err);
                resolve();
              }
            );
          });
        }

        if (cancelled) return;

        await instance.start();
        setStatus("tracking");

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
      } catch (err) {
        console.error("[ARMarkerViewer] init error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Gagal memulai AR");
        setStatus("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (instance) {
        try {
          instance.renderer.setAnimationLoop(null);
          instance.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [mindFileUrl, assets]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <p className="text-sm">Menyiapkan kamera & pengenalan gambar...</p>
          <p className="text-xs text-white/60 mt-2">Izinkan akses kamera jika diminta</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-danger mb-3" />
          <p className="text-base font-semibold mb-2">AR tidak dapat dimulai</p>
          <p className="text-sm text-white/70 mb-4 max-w-sm">{errorMsg}</p>
          <Button variant="outline" onClick={onExit}>Kembali</Button>
        </div>
      )}

      {status === "tracking" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs backdrop-blur z-10 pointer-events-none">
          Arahkan kamera ke gambar marker
        </div>
      )}

      {markerImageUrl && status === "tracking" && (
        <div className="absolute bottom-4 left-4 w-20 h-20 rounded-lg overflow-hidden border-2 border-white/60 shadow-lg z-10 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markerImageUrl} alt="marker" className="w-full h-full object-cover" />
        </div>
      )}

      {onExit && (
        <button
          onClick={onExit}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-20 backdrop-blur"
          aria-label="Keluar AR"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
