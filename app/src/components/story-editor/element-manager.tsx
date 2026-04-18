"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ElementAsset, ElementAssetType, Recording } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio/audio-player";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileAudio,
  FileImage,
  Folder,
  Loader2,
  Mic,
  Music,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface ElementManagerProps {
  storyId: string;
  /** Called when teacher selects an asset to assign to a dialog/narration */
  onAssignAsset?: (asset: ElementAsset, target: { type: "dialog" | "narration"; id?: string }) => void;
  className?: string;
}

function getTypeIcon(type: ElementAssetType) {
  switch (type) {
    case "image": return <FileImage className="w-4 h-4 text-blue-500" />;
    case "audio": return <FileAudio className="w-4 h-4 text-green-500" />;
    case "recording": return <Mic className="w-4 h-4 text-red-500" />;
    default: return <File className="w-4 h-4 text-muted" />;
  }
}

function getTypeLabel(type: ElementAssetType) {
  switch (type) {
    case "image": return "Gambar";
    case "audio": return "Audio";
    case "recording": return "Rekaman";
    default: return "File";
  }
}

export function ElementManager({ storyId, onAssignAsset, className = "" }: ElementManagerProps) {
  const supabase = createClient();
  const [assets, setAssets] = useState<ElementAsset[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>("recording");

  const loadAssets = useCallback(async () => {
    const [assetsRes, recordingsRes] = await Promise.all([
      supabase
        .from("element_assets")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("recordings")
        .select("*, profiles:student_id(name)")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false }),
    ]);

    setAssets((assetsRes.data || []) as ElementAsset[]);

    // Map recordings with student name
    const recs = (recordingsRes.data || []).map((r: Record<string, unknown>) => ({
      ...r,
      student_name: (r.profiles as Record<string, unknown>)?.name || "Unknown",
    }));
    setRecordings(recs as Recording[]);
    setLoading(false);
  }, [storyId, supabase]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  async function handleUpload(file: File) {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext = file.name.split(".").pop() || "bin";
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const bucket = isImage ? "panel-images" : "audio";
    const assetType: ElementAssetType = isImage ? "image" : isAudio ? "audio" : "file";

    const path = `${user.id}/${storyId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file);
    if (uploadErr) {
      alert("Upload gagal: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    const { data } = await supabase.from("element_assets").insert({
      story_id: storyId,
      type: assetType,
      label: file.name,
      url: urlData.publicUrl,
      source: "upload",
      created_by: user.id,
    }).select().single();

    if (data) setAssets((prev) => [data as ElementAsset, ...prev]);
    setUploading(false);
  }

  async function deleteAsset(id: string) {
    if (!confirm("Hapus aset ini?")) return;
    await supabase.from("element_assets").delete().eq("id", id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  async function updateRecordingStatus(recId: string, status: "approved" | "rejected", autoActive: boolean) {
    await supabase.from("recordings").update({ status, auto_active: autoActive }).eq("id", recId);
    setRecordings((prev) =>
      prev.map((r) => r.id === recId ? { ...r, status, auto_active: autoActive } : r)
    );
  }

  // Group assets by type
  const grouped: Record<string, ElementAsset[]> = {};
  assets.forEach((a) => {
    if (!grouped[a.type]) grouped[a.type] = [];
    grouped[a.type].push(a);
  });

  const typeOrder: ElementAssetType[] = ["recording", "audio", "image", "file"];

  return (
    <div className={`bg-surface-card rounded-xl border border-border overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Folder className="w-4 h-4" /> Element Manager
        </p>
        <label className="cursor-pointer">
          <Button variant="outline" size="sm" disabled={uploading} type="button">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </Button>
          <input
            type="file"
            accept="image/*,audio/*,.mp3,.wav,.webm,.ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {/* Student Recordings section */}
          {recordings.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedType(expandedType === "recordings_section" ? null : "recordings_section")}
                className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-surface-alt/50 transition-colors text-left"
              >
                {expandedType === "recordings_section" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <Mic className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold flex-1">Rekaman Siswa ({recordings.length})</span>
              </button>
              {expandedType === "recordings_section" && (
                <div className="px-4 pb-3 space-y-1.5">
                  {recordings.map((rec) => (
                    <div key={rec.id} className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border">
                      <Mic className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">
                          {rec.student_name} — {rec.type === "narration" ? "Narasi" : "Dialog"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            rec.status === "approved" ? "bg-green-100 text-green-700" :
                            rec.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {rec.status === "approved" ? "Disetujui" : rec.status === "rejected" ? "Ditolak" : "Menunggu"}
                          </span>
                          {rec.auto_active && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Auto</span>
                          )}
                        </div>
                      </div>
                      <AudioPlayer src={rec.audio_url} compact label="" />
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => updateRecordingStatus(rec.id, "approved", true)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded text-[9px]"
                          title="Setujui & aktifkan otomatis"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => updateRecordingStatus(rec.id, "approved", false)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[9px]"
                          title="Setujui (manual)"
                        >
                          ✓M
                        </button>
                        <button
                          onClick={() => updateRecordingStatus(rec.id, "rejected", false)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded text-[9px]"
                          title="Tolak"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Uploaded assets grouped by type */}
          {typeOrder.map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;
            const isExpanded = expandedType === type;
            return (
              <div key={type}>
                <button
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-surface-alt/50 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {getTypeIcon(type)}
                  <span className="text-xs font-semibold flex-1">{getTypeLabel(type)} ({items.length})</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-1">
                    {items.map((asset) => (
                      <div key={asset.id} className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border group">
                        {getTypeIcon(asset.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">{asset.label}</p>
                          <p className="text-[9px] text-muted">{asset.source}</p>
                        </div>
                        {asset.type === "audio" && (
                          <AudioPlayer src={asset.url} compact label="" />
                        )}
                        {asset.type === "image" && (
                          <img src={asset.url} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        {onAssignAsset && (
                          <button
                            onClick={() => onAssignAsset(asset, { type: "dialog" })}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Pakai
                          </button>
                        )}
                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="p-1 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {assets.length === 0 && recordings.length === 0 && (
            <div className="text-center py-8">
              <Folder className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">Belum ada elemen</p>
              <p className="text-xs text-muted mt-1">Upload file atau tunggu rekaman siswa</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
