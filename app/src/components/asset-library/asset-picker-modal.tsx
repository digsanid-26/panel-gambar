"use client";

import { useEffect, useState, useCallback } from "react";
import type { Asset, AssetType, AssetVisibility } from "@/lib/types";
import {
  listAssets,
  uploadAsset,
  ASSET_TYPE_LABELS,
  acceptForAssetType,
} from "@/lib/asset-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
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
} from "lucide-react";

interface AssetPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (asset: Asset) => void;
  /** Restrict to a specific asset type (or list of types). Omit for all. */
  type?: AssetType | AssetType[];
  /** Allow uploading directly from this modal */
  allowUpload?: boolean;
  title?: string;
}

const SCOPE_OPTIONS: { key: "mine" | "public" | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "mine", label: "Saya" },
  { key: "public", label: "Publik" },
];

function typeIcon(t: AssetType) {
  const cls = "w-4 h-4";
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

export function AssetPickerModal({
  open,
  onClose,
  onPick,
  type,
  allowUpload = true,
  title = "Pilih dari Galeri",
}: AssetPickerModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<"mine" | "public" | "all">("all");
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<AssetType | "all">("all");
  const [uploading, setUploading] = useState(false);

  // Determine which type tabs to show
  const allowedTypes: AssetType[] = Array.isArray(type)
    ? type
    : type
      ? [type]
      : ["avatar", "image", "video", "audio", "model_3d", "document", "other"];

  const reload = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const t =
      activeType !== "all"
        ? activeType
        : allowedTypes.length > 1
          ? allowedTypes
          : allowedTypes[0];
    const data = await listAssets({ type: t, scope, query, limit: 60 });
    setAssets(data);
    setLoading(false);
  }, [open, scope, query, activeType, allowedTypes]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveType("all");
      setScope("all");
    }
  }, [open]);

  async function handleUploadFile(file: File) {
    setUploading(true);
    const inferred: AssetType =
      activeType !== "all"
        ? activeType
        : allowedTypes.length === 1
          ? allowedTypes[0]
          : (file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : "other");

    const asset = await uploadAsset({
      file,
      type: inferred,
      visibility: "private",
    });
    setUploading(false);
    if (asset) {
      await reload();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-card rounded-2xl border border-border shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-5 py-3 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau deskripsi..."
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
            {allowUpload && (
              <label
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold cursor-pointer hover:bg-primary/5 transition-colors ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
                <input
                  type="file"
                  className="hidden"
                  accept={acceptForAssetType(activeType === "all" ? (allowedTypes.length === 1 ? allowedTypes[0] : "all") : activeType)}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Type tabs */}
          {allowedTypes.length > 1 && (
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
              {allowedTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeType === t
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {typeIcon(t)}
                  {ASSET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted">
              <File className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Tidak ada aset.</p>
              {allowUpload && (
                <p className="text-xs mt-1">Klik tombol Upload di atas untuk menambahkan aset baru.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} onPick={onPick} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </div>
  );
}

function AssetCard({ asset, onPick }: { asset: Asset; onPick: (a: Asset) => void }) {
  const isImage = asset.type === "image" || asset.type === "avatar";
  const isVideo = asset.type === "video";
  const isAudio = asset.type === "audio";

  return (
    <button
      onClick={() => onPick(asset)}
      className="group relative aspect-square bg-surface rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all overflow-hidden text-left"
      title={asset.name}
    >
      {/* Preview */}
      <div className="absolute inset-0 flex items-center justify-center bg-surface-alt">
        {isImage && asset.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
        ) : isVideo && asset.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
        ) : isVideo ? (
          <VideoIcon className="w-10 h-10 text-muted" />
        ) : isAudio ? (
          <MusicIcon className="w-10 h-10 text-muted" />
        ) : asset.type === "model_3d" ? (
          <Box className="w-10 h-10 text-muted" />
        ) : asset.type === "document" ? (
          <FileText className="w-10 h-10 text-muted" />
        ) : (
          <File className="w-10 h-10 text-muted" />
        )}
      </div>

      {/* Visibility badge */}
      <div className="absolute top-1.5 left-1.5">
        {asset.visibility === "public" ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-semibold">
            <Globe2 className="w-3 h-3" /> Publik
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold">
            <Lock className="w-3 h-3" /> Privat
          </span>
        )}
      </div>

      {/* Name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
        <p className="text-white text-xs font-medium line-clamp-2">{asset.name}</p>
      </div>
    </button>
  );
}
