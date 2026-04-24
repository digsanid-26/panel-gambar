"use client";

/**
 * AR Model Viewer — menampilkan GLB dengan React Three Fiber.
 * Mode "model-only" (tanpa kamera/AR) — user bisa putar/zoom model.
 * Digunakan sebagai fallback jika device tidak support AR,
 * dan sebagai tampilan default untuk scene bertipe "model-only".
 */

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  Html,
} from "@react-three/drei";
import type { Group } from "three";
import type { ARAsset } from "@/lib/ar/types";
import { Loader2 } from "lucide-react";

interface ARModelViewerProps {
  assets: ARAsset[];
  /** Aktifkan auto-rotate saat idle */
  autoRotate?: boolean;
  /** Warna background canvas */
  background?: string;
}

function Model({ asset }: { asset: ARAsset }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(asset.src);
  const { actions, names } = useAnimations(animations, group);

  // Play animation if specified
  useEffect(() => {
    if (asset.animationName && actions[asset.animationName]) {
      actions[asset.animationName]?.reset().play();
    } else if (names.length > 0 && actions[names[0]]) {
      // auto-play first animation if any
      actions[names[0]]?.reset().play();
    }
  }, [actions, names, asset.animationName]);

  const t = asset.transform;
  const scaleValue =
    typeof t?.scale === "number"
      ? ([t.scale, t.scale, t.scale] as [number, number, number])
      : t?.scale ?? [1, 1, 1];

  return (
    <group
      ref={group}
      position={t?.position ?? [0, 0, 0]}
      rotation={t?.rotation ?? [0, 0, 0]}
      scale={scaleValue}
    >
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Memuat model 3D...</span>
      </div>
    </Html>
  );
}

export function ARModelViewer({
  assets,
  autoRotate = true,
  background = "#0a0a1a",
}: ARModelViewerProps) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden"
      style={{ background }}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
    >
      <Canvas
        camera={{ position: [0, 1.5, 4], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.4} />

        <Suspense fallback={<LoadingFallback />}>
          {assets.map((asset) => (
            <Model key={asset.id} asset={asset} />
          ))}
          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          autoRotate={autoRotate && !isPaused}
          autoRotateSpeed={1.5}
          enablePan={false}
          minDistance={1}
          maxDistance={10}
          enableDamping
          dampingFactor={0.08}
        />

        <SceneTicker />
      </Canvas>
    </div>
  );
}

// Keep frameloop responsive
function SceneTicker() {
  useFrame(() => {
    // no-op; ensures render loop runs
  });
  return null;
}
