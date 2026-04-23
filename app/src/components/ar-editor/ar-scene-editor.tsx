"use client";

/**
 * AR Scene Editor — editor utama untuk satu ARScene.
 *
 * Layout:
 * ┌────────────────────────────────────────┬──────────────────────┐
 * │                                         │  Properti Scene      │
 * │                                         │  (judul, tipe, dll)  │
 * │       3D Preview (Canvas)               ├──────────────────────┤
 * │       + TransformControls gizmo         │  Daftar Aset         │
 * │                                         │  (+ Upload GLB)      │
 * │                                         ├──────────────────────┤
 * │                                         │  Properti Aset       │
 * │                                         │  (posisi, audio, ..) │
 * ├─────────────────────────────────────────┴──────────────────────┤
 * │  Marker image + .mind file (jika type = marker)                 │
 * └────────────────────────────────────────────────────────────────┘
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteARFile,
  deleteUserScene,
  generateAssetId,
  saveARFile,
  saveUserScene,
} from "@/lib/ar/storage";
import type { ARAsset, ARScene, ARTransform } from "@/lib/ar/types";
import {
  ArrowLeft,
  Box,
  Copy,
  Eye,
  Loader2,
  Move,
  Music,
  Play,
  Plus,
  RotateCw,
  Save,
  Scaling,
  Trash2,
  Upload,
} from "lucide-react";

const ARPreview = dynamic(
  () => import("./ar-editor-preview").then((m) => m.ARPreview),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-surface-card rounded-xl">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    ),
  }
);

type TransformMode = "translate" | "rotate" | "scale";

interface ARSceneEditorProps {
  initialScene: ARScene;
}

export function ARSceneEditor({ initialScene }: ARSceneEditorProps) {
  const router = useRouter();
  const [scene, setScene] = useState<ARScene>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [saving, setSaving] = useState(false);
  const [savedMark, setSavedMark] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const glbInputRef = useRef<HTMLInputElement>(null);
  const markerImgInputRef = useRef<HTMLInputElement>(null);
  const markerMindInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const selectedAsset = useMemo(
    () => scene.assets.find((a) => a.id === selectedId) ?? null,
    [scene.assets, selectedId]
  );

  // -------------------- Mutators --------------------

  function updateScene(patch: Partial<ARScene>) {
    setScene((prev) => ({ ...prev, ...patch }));
  }

  function updateAsset(id: string, patch: Partial<ARAsset>) {
    setScene((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }

  const handleTransformChange = useCallback((id: string, transform: ARTransform) => {
    setScene((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === id ? { ...a, transform } : a)),
    }));
  }, []);

  async function handleGLBUpload(file: File) {
    if (!file) return;
    setUploadingAsset(true);
    try {
      const idbUrl = await saveARFile(file, file.name);
      const newAsset: ARAsset = {
        id: generateAssetId(),
        name: file.name.replace(/\.(glb|gltf)$/i, ""),
        src: idbUrl,
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
      };
      setScene((prev) => ({ ...prev, assets: [...prev.assets, newAsset] }));
      setSelectedId(newAsset.id);
    } finally {
      setUploadingAsset(false);
    }
  }

  async function handleDeleteAsset(id: string) {
    const target = scene.assets.find((a) => a.id === id);
    if (!target) return;
    if (!confirm(`Hapus aset "${target.name}"?`)) return;
    if (target.src) await deleteARFile(target.src);
    if (target.audioUrl) await deleteARFile(target.audioUrl);
    setScene((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function handleDuplicateAsset(id: string) {
    const src = scene.assets.find((a) => a.id === id);
    if (!src) return;
    const clone: ARAsset = {
      ...src,
      id: generateAssetId(),
      name: src.name + " (copy)",
    };
    setScene((prev) => ({ ...prev, assets: [...prev.assets, clone] }));
    setSelectedId(clone.id);
  }

  async function handleCoverUpload(file: File) {
    const url = await saveARFile(file, file.name);
    if (scene.coverImage) await deleteARFile(scene.coverImage);
    updateScene({ coverImage: url });
  }

  async function handleMarkerImageUpload(file: File) {
    const url = await saveARFile(file, file.name);
    if (scene.markerImage) await deleteARFile(scene.markerImage);
    updateScene({ markerImage: url });
  }

  async function handleMarkerMindUpload(file: File) {
    const url = await saveARFile(file, file.name);
    if (scene.markerMindFile) await deleteARFile(scene.markerMindFile);
    updateScene({ markerMindFile: url });
  }

  async function handleAudioUpload(assetId: string, file: File) {
    const url = await saveARFile(file, file.name);
    const target = scene.assets.find((a) => a.id === assetId);
    if (target?.audioUrl) await deleteARFile(target.audioUrl);
    updateAsset(assetId, { audioUrl: url, audioTrigger: "auto" });
  }

  // -------------------- Save / delete --------------------

  async function handleSave() {
    setSaving(true);
    try {
      saveUserScene(scene);
      setSavedMark(true);
      setTimeout(() => setSavedMark(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScene() {
    if (!confirm(`Hapus scene "${scene.title}"? Aksi ini tidak dapat dibatalkan.`)) return;
    await deleteUserScene(scene.id);
    router.push("/ar");
  }

  // -------------------- Render --------------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Preview column */}
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-surface-card border border-border rounded-xl p-1">
            <button
              onClick={() => setTransformMode("translate")}
              className={`p-1.5 rounded-lg transition-colors ${
                transformMode === "translate"
                  ? "bg-primary text-background"
                  : "text-muted hover:text-foreground"
              }`}
              title="Geser"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTransformMode("rotate")}
              className={`p-1.5 rounded-lg transition-colors ${
                transformMode === "rotate"
                  ? "bg-primary text-background"
                  : "text-muted hover:text-foreground"
              }`}
              title="Putar"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTransformMode("scale")}
              className={`p-1.5 rounded-lg transition-colors ${
                transformMode === "scale"
                  ? "bg-primary text-background"
                  : "text-muted hover:text-foreground"
              }`}
              title="Skala"
            >
              <Scaling className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/ar/${scene.slug}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedMark ? (
                "Tersimpan ✓"
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 3D canvas */}
        <div className="aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-border">
          <ARPreview
            assets={scene.assets}
            selectedId={selectedId}
            transformMode={transformMode}
            onSelect={setSelectedId}
            onTransformChange={handleTransformChange}
          />
        </div>

        {/* Marker section (only for marker type) */}
        {scene.type === "marker" && (
          <section className="p-4 bg-surface-card border border-border rounded-xl space-y-3">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              Marker AR
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Marker image */}
              <div>
                <label className="block text-[11px] text-muted mb-1">Gambar Marker</label>
                <div className="flex items-center gap-2">
                  {scene.markerImage ? (
                    <MarkerImagePreview src={scene.markerImage} />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-surface-alt border border-dashed border-border flex items-center justify-center text-muted text-xs">
                      kosong
                    </div>
                  )}
                  <input
                    ref={markerImgInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMarkerImageUpload(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markerImgInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* .mind file */}
              <div>
                <label className="block text-[11px] text-muted mb-1">
                  File .mind
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className={`px-2 py-1 rounded-lg text-[11px] border ${
                      scene.markerMindFile
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface-alt border-border text-muted"
                    }`}
                  >
                    {scene.markerMindFile ? "terpasang" : "belum ada"}
                  </div>
                  <input
                    ref={markerMindInputRef}
                    type="file"
                    accept=".mind"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMarkerMindUpload(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markerMindInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              File <code className="bg-surface-alt px-1 rounded">.mind</code> dihasilkan
              dari gambar marker. Kompilasi gratis via{" "}
              <a
                href="https://hiukim.github.io/mind-ar-js-doc/tools/compile"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                MindAR Compiler
              </a>
              {" "}lalu unggah hasilnya di sini. (Kompilasi di-browser akan tersedia di Fase B+.)
            </p>
          </section>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-3">
        {/* Back link */}
        <Link
          href="/ar"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke galeri
        </Link>

        {/* Scene properties */}
        <section className="p-3 bg-surface-card border border-border rounded-xl space-y-2">
          <h3 className="font-heading font-semibold text-sm">Info Scene</h3>
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Judul</label>
            <Input
              value={scene.title}
              onChange={(e) => updateScene({ title: e.target.value })}
              className="!text-xs !py-1.5"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Deskripsi</label>
            <textarea
              value={scene.description}
              onChange={(e) => updateScene({ description: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface-alt text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Instruksi siswa</label>
            <textarea
              value={scene.instruction ?? ""}
              onChange={(e) => updateScene({ instruction: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface-alt text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Misal: Arahkan kamera ke halaman 10 buku..."
            />
          </div>

          {/* Cover */}
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Cover</label>
            <div className="flex items-center gap-2">
              {scene.coverImage ? (
                <MarkerImagePreview src={scene.coverImage} />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-surface-alt border border-dashed border-border flex items-center justify-center text-muted text-[10px]">
                  kosong
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverUpload(f);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Asset list */}
        <section className="p-3 bg-surface-card border border-border rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm">
              Aset ({scene.assets.length})
            </h3>
            <input
              ref={glbInputRef}
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleGLBUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => glbInputRef.current?.click()}
              disabled={uploadingAsset}
            >
              {uploadingAsset ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  GLB
                </>
              )}
            </Button>
          </div>

          {scene.assets.length === 0 ? (
            <p className="text-[11px] text-muted text-center py-3">
              Belum ada aset. Unggah file GLB/GLTF.
            </p>
          ) : (
            <ul className="space-y-1">
              {scene.assets.map((a) => (
                <li
                  key={a.id}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    selectedId === a.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-surface-alt text-foreground"
                  }`}
                  onClick={() => setSelectedId(a.id)}
                >
                  <Box className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{a.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateAsset(a.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary"
                    title="Duplikat"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAsset(a.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-danger"
                    title="Hapus"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Selected asset properties */}
        {selectedAsset && (
          <section className="p-3 bg-surface-card border border-border rounded-xl space-y-2">
            <h3 className="font-heading font-semibold text-sm">Properti Aset</h3>

            <div>
              <label className="block text-[11px] text-muted mb-0.5">Nama</label>
              <Input
                value={selectedAsset.name}
                onChange={(e) => updateAsset(selectedAsset.id, { name: e.target.value })}
                className="!text-xs !py-1.5"
              />
            </div>

            <TransformFields
              transform={selectedAsset.transform ?? {}}
              onChange={(t) => updateAsset(selectedAsset.id, { transform: t })}
            />

            {/* Audio */}
            <div>
              <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
                <Music className="w-3 h-3" />
                Audio narasi
              </label>
              <div className="flex items-center gap-2">
                {selectedAsset.audioUrl ? (
                  <AudioPreview src={selectedAsset.audioUrl} />
                ) : (
                  <span className="text-[11px] text-muted italic">belum ada</span>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAudioUpload(selectedAsset.id, f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                </Button>
              </div>
              {selectedAsset.audioUrl && (
                <div className="mt-1">
                  <label className="text-[10px] text-muted">Pemicu</label>
                  <select
                    value={selectedAsset.audioTrigger ?? "auto"}
                    onChange={(e) =>
                      updateAsset(selectedAsset.id, {
                        audioTrigger: e.target.value as "auto" | "tap",
                      })
                    }
                    className="w-full mt-0.5 px-2 py-1 rounded-lg border border-border bg-surface-alt text-[11px]"
                  >
                    <option value="auto">Otomatis saat scene tampil</option>
                    <option value="tap">Saat siswa tap objek</option>
                  </select>
                </div>
              )}
            </div>

            {/* Animation name */}
            <div>
              <label className="block text-[11px] text-muted mb-0.5">
                Nama animasi (opsional)
              </label>
              <Input
                value={selectedAsset.animationName ?? ""}
                onChange={(e) =>
                  updateAsset(selectedAsset.id, {
                    animationName: e.target.value || undefined,
                  })
                }
                placeholder="Misal: Run, Idle"
                className="!text-xs !py-1.5"
              />
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="p-3 bg-surface-card border border-danger/30 rounded-xl">
          <Button variant="danger" size="sm" className="w-full" onClick={handleDeleteScene}>
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Scene
          </Button>
        </section>
      </aside>
    </div>
  );
}

// ---------- Helper components ----------

function TransformFields({
  transform,
  onChange,
}: {
  transform: ARTransform;
  onChange: (t: ARTransform) => void;
}) {
  const pos = transform.position ?? [0, 0, 0];
  const rot = transform.rotation ?? [0, 0, 0];
  const scale = typeof transform.scale === "number" ? transform.scale : transform.scale?.[0] ?? 1;

  function num(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[11px] text-muted mb-0.5">Posisi (X, Y, Z)</label>
        <div className="grid grid-cols-3 gap-1">
          {pos.map((v, i) => (
            <input
              key={i}
              type="number"
              step={0.1}
              value={v}
              onChange={(e) => {
                const next = [...pos] as [number, number, number];
                next[i] = num(e.target.value);
                onChange({ ...transform, position: next });
              }}
              className="w-full px-1.5 py-1 rounded-lg border border-border bg-surface-alt text-[11px]"
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-muted mb-0.5">Rotasi (rad)</label>
        <div className="grid grid-cols-3 gap-1">
          {rot.map((v, i) => (
            <input
              key={i}
              type="number"
              step={0.1}
              value={Number(v.toFixed(3))}
              onChange={(e) => {
                const next = [...rot] as [number, number, number];
                next[i] = num(e.target.value);
                onChange({ ...transform, rotation: next });
              }}
              className="w-full px-1.5 py-1 rounded-lg border border-border bg-surface-alt text-[11px]"
            />
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-muted mb-0.5">Skala uniform</label>
        <input
          type="number"
          step={0.1}
          value={scale}
          onChange={(e) => onChange({ ...transform, scale: num(e.target.value) })}
          className="w-full px-1.5 py-1 rounded-lg border border-border bg-surface-alt text-[11px]"
        />
      </div>
    </div>
  );
}

function MarkerImagePreview({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useMemo(() => {
    let cancelled = false;
    import("@/lib/ar/storage").then(({ resolveARUrl }) => {
      resolveARUrl(src).then((u) => {
        if (!cancelled && u) setUrl(u);
      });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  if (!url) return <div className="w-16 h-16 rounded-lg bg-surface-alt" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border" />;
}

function AudioPreview({ src }: { src: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useMemo(() => {
    let cancelled = false;
    import("@/lib/ar/storage").then(({ resolveARUrl }) => {
      resolveARUrl(src).then((u) => {
        if (!cancelled && u) setUrl(u);
      });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function playPreview() {
    if (!url) return;
    const a = new Audio(url);
    a.play().catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={playPreview}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] hover:bg-primary/20 transition-colors"
    >
      <Play className="w-3 h-3" />
      coba
    </button>
  );
}
