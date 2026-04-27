"use client";

import { useEffect, useState, useCallback } from "react";
import type { Asset, AssetType, AssetVisibility } from "@/lib/types";
import {
  listAssets,
  uploadAsset,
  updateAsset,
  deleteAsset,
  ASSET_TYPE_LABELS,
  acceptForAssetType,
  inferAssetType,
} from "@/lib/asset-library";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Upload,
  Loader2,
  Lock,
  Globe2,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Box,
  FileText,
  User as UserIcon,
  File,
  Trash2,
  FolderOpen,
} from "lucide-react";

const ALL_TYPES: AssetType[] = ["avatar", "image", "video", "audio", "model_3d", "document", "other"];

const SCOPE_OPTIONS: { key: "mine" | "public" | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "mine", label: "Saya" },
  { key: "public", label: "Publik" },
];

function typeIcon(t: AssetType, cls = "w-4 h-4") {
  switch (t) {
    case "avatar": return <UserIcon className={cls} />;
    case "image": return <ImageIcon className={cls} />;
    case "video": return <VideoIcon className={cls} />;
    case "audio": return <MusicIcon className={cls} />;
    case "model_3d": return <Box className={cls} />;
    case "document": return <FileText className={cls} />;
    default: return <File className={cls} />;
  }
}

export default function SourceManagerPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "public" | "all">("all");
  const [activeType, setActiveType] = useState<AssetType | "all">("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; type: AssetType } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const t = activeType === "all" ? undefined : activeType;
    const data = await listAssets({ type: t, scope, query, limit: 200 });
    setAssets(data);
    setLoading(false);
  }, [scope, activeType, query]);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleFileSelected(file: File) {
    const inferred = activeType === "all" ? inferAssetType(file) : activeType;
    setPendingUpload({ file, type: inferred });
  }

  async function confirmUpload(input: {
    name: string;
    type: AssetType;
    visibility: AssetVisibility;
    description: string;
    tags: string[];
  }) {
    if (!pendingUpload) return;
    setUploading(true);
    const asset = await uploadAsset({
      file: pendingUpload.file,
      name: input.name,
      type: input.type,
      visibility: input.visibility,
      description: input.description,
      tags: input.tags,
    });
    setUploading(false);
    if (asset) {
      setPendingUpload(null);
      reload();
    } else {
      alert("Gagal upload aset.");
    }
  }

  async function handleToggleVisibility(asset: Asset) {
    const next: AssetVisibility = asset.visibility === "public" ? "private" : "public";
    const ok = await updateAsset(asset.id, { visibility: next });
    if (ok) reload();
  }

  async function handleDelete(asset: Asset) {
    if (!confirm(`Hapus aset "${asset.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const ok = await deleteAsset(asset.id);
    if (ok) reload();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" />
              Source Manager
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Kelola aset reusable: avatar, gambar, video, audio, 3D, dan dokumen. Aset publik bisa dipakai bersama oleh seluruh guru.
            </p>
          </div>
          <label
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Aset
            <input
              type="file"
              className="hidden"
              accept={acceptForAssetType(activeType === "all" ? "all" : activeType)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Toolbar */}
        <div className="bg-surface-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari aset..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 bg-surface-alt rounded-xl p-1">
              {SCOPE_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScope(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    scope === s.key ? "bg-primary text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveType("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeType === "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-foreground border-border hover:border-primary/40"
              }`}
            >
              Semua
            </button>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeType === t
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-foreground border-border hover:border-primary/40"
                }`}
              >
                {typeIcon(t, "w-3.5 h-3.5")}
                {ASSET_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted bg-surface-card rounded-xl border border-border">
            <File className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Belum ada aset.</p>
            <p className="text-xs mt-1">Klik <strong>Upload Aset</strong> untuk menambahkan aset pertama.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {assets.map((a) => (
              <AssetTile
                key={a.id}
                asset={a}
                onToggleVisibility={() => handleToggleVisibility(a)}
                onDelete={() => handleDelete(a)}
              />
            ))}
          </div>
        )}
      </main>

      {pendingUpload && (
        <UploadDialog
          file={pendingUpload.file}
          initialType={pendingUpload.type}
          uploading={uploading}
          onCancel={() => setPendingUpload(null)}
          onConfirm={confirmUpload}
        />
      )}
    </div>
  );
}

function AssetTile({
  asset,
  onToggleVisibility,
  onDelete,
}: {
  asset: Asset;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      setIsOwner(user?.id === asset.owner_id);
    });
  }, [asset.owner_id]);

  const isImage = asset.type === "image" || asset.type === "avatar";
  const isVideo = asset.type === "video";
  const isAudio = asset.type === "audio";

  return (
    <div className="group relative aspect-square bg-surface-card rounded-xl border border-border overflow-hidden">
      {/* Preview */}
      <div className="absolute inset-0 flex items-center justify-center bg-surface-alt">
        {isImage && asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <VideoIcon className="w-12 h-12 text-muted" />
        ) : isAudio ? (
          <MusicIcon className="w-12 h-12 text-muted" />
        ) : asset.type === "model_3d" ? (
          <Box className="w-12 h-12 text-muted" />
        ) : asset.type === "document" ? (
          <FileText className="w-12 h-12 text-muted" />
        ) : (
          <File className="w-12 h-12 text-muted" />
        )}
      </div>

      {/* Visibility badge */}
      <button
        onClick={isOwner ? onToggleVisibility : undefined}
        disabled={!isOwner}
        className="absolute top-1.5 left-1.5"
        title={isOwner ? "Klik untuk ubah visibilitas" : asset.visibility === "public" ? "Publik" : "Privat"}
      >
        {asset.visibility === "public" ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-semibold">
            <Globe2 className="w-3 h-3" /> Publik
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">
            <Lock className="w-3 h-3" /> Privat
          </span>
        )}
      </button>

      {/* Delete (owner only) */}
      {isOwner && (
        <button
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 text-white hover:bg-danger"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
        <p className="text-white text-xs font-medium line-clamp-2">{asset.name}</p>
      </div>
    </div>
  );
}

function UploadDialog({
  file,
  initialType,
  uploading,
  onCancel,
  onConfirm,
}: {
  file: File;
  initialType: AssetType;
  uploading: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    name: string;
    type: AssetType;
    visibility: AssetVisibility;
    description: string;
    tags: string[];
  }) => void;
}) {
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ""));
  const [type, setType] = useState<AssetType>(initialType);
  const [visibility, setVisibility] = useState<AssetVisibility>("private");
  const [description, setDescription] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function addTag() {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagDraft("");
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5 space-y-4">
        <h2 className="text-lg font-bold">Upload Aset Baru</h2>

        <div className="bg-surface-alt rounded-lg px-3 py-2 text-sm">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB · {file.type || "unknown"}</p>
        </div>

        <Input label="Nama Aset" value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <label className="block text-sm font-semibold mb-1.5">Tipe</label>
          <div className="grid grid-cols-4 gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  type === t
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-foreground border-border hover:border-primary/40"
                }`}
              >
                {ASSET_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Visibilitas</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                visibility === "private"
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-surface border-border text-foreground hover:border-primary/40"
              }`}
            >
              <Lock className="w-4 h-4" /> Privat (hanya saya)
            </button>
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                visibility === "public"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-700"
                  : "bg-surface border-border text-foreground hover:border-primary/40"
              }`}
            >
              <Globe2 className="w-4 h-4" /> Publik (bisa dipakai guru lain)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Tag (opsional)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="hover:text-danger">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Tambah tag, tekan Enter..."
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>Tambah</Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">Deskripsi (opsional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 bg-surface-alt border-2 border-border rounded-xl text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={uploading}>Batal</Button>
          <Button onClick={() => onConfirm({ name, type, visibility, description, tags })} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
