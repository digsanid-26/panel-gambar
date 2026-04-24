"use client";

/**
 * AR Editor Preview — Canvas 3D interaktif dengan TransformControls (gizmo)
 * untuk mengatur posisi / rotasi / skala aset saat editor aktif.
 *
 * Pola reuse dari CanvasEditor (Konva): state dari parent, callback
 * transform saat drag gizmo berakhir.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  TransformControls,
  Grid,
  Html,
} from "@react-three/drei";
import type { Group } from "three";
import type { ARAsset, ARTransform } from "@/lib/ar/types";
import { Loader2 } from "lucide-react";

type TransformMode = "translate" | "rotate" | "scale";

interface ARPreviewProps {
  assets: ARAsset[];
  selectedId: string | null;
  transformMode: TransformMode;
  onSelect: (id: string | null) => void;
  onTransformChange: (id: string, transform: ARTransform) => void;
}

function EditableModel({
  asset,
  isSelected,
  transformMode,
  onSelect,
  onTransformChange,
}: {
  asset: ARAsset;
  isSelected: boolean;
  transformMode: TransformMode;
  onSelect: (id: string) => void;
  onTransformChange: (id: string, transform: ARTransform) => void;
}) {
  const groupRef = useRef<Group>(null);
  const src = asset.src;
  const { scene, animations } = useGLTF(src);
  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (asset.animationName && actions[asset.animationName]) {
      actions[asset.animationName]?.reset().play();
    } else if (names.length > 0 && actions[names[0]]) {
      actions[names[0]]?.reset().play();
    }
  }, [actions, names, asset.animationName]);

  const t = asset.transform ?? {};
  const scaleValue =
    typeof t.scale === "number"
      ? ([t.scale, t.scale, t.scale] as [number, number, number])
      : t.scale ?? [1, 1, 1];

  function emitTransform() {
    if (!groupRef.current) return;
    const g = groupRef.current;
    onTransformChange(asset.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: [g.scale.x, g.scale.y, g.scale.z],
    });
  }

  const content = (
    <group
      ref={groupRef}
      position={t.position ?? [0, 0, 0]}
      rotation={t.rotation ?? [0, 0, 0]}
      scale={scaleValue}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(asset.id);
      }}
    >
      <primitive object={scene.clone(true)} />
    </group>
  );

  if (isSelected && groupRef.current) {
    return (
      <>
        {content}
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          onMouseUp={emitTransform}
          size={0.8}
        />
      </>
    );
  }

  return content;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs">Memuat model 3D...</span>
      </div>
    </Html>
  );
}

export function ARPreview({
  assets,
  selectedId,
  transformMode,
  onSelect,
  onTransformChange,
}: ARPreviewProps) {
  const resolvedAssets = assets;

  return (
    <div className="relative w-full h-full bg-[#0a0a1a] rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [2, 2, 4], fov: 50 }}
        dpr={[1, 2]}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.4} />

        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#334155"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid
        />

        <Suspense fallback={<LoadingFallback />}>
          {resolvedAssets.map((asset) => (
            <EditableModel
              key={asset.id}
              asset={asset}
              isSelected={selectedId === asset.id}
              transformMode={transformMode}
              onSelect={onSelect}
              onTransformChange={onTransformChange}
            />
          ))}
          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={0.5}
          maxDistance={20}
        />
      </Canvas>

      {assets.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted">
          <p className="text-sm">Scene masih kosong</p>
          <p className="text-xs mt-1">Unggah model GLB dari panel kanan →</p>
        </div>
      )}
    </div>
  );
}
