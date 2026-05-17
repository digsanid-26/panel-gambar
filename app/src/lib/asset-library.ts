"use client";

import type { Asset, AssetType, AssetVisibility } from "@/lib/types";

const BUCKET = "assets";

export interface ListAssetsParams {
  /** Filter by single type or array of types */
  type?: AssetType | AssetType[];
  /** 'mine' = only my assets · 'public' = only public · 'all' = mine + public (default) */
  scope?: "mine" | "public" | "all";
  /** Free text search against name/description */
  query?: string;
  /** Filter by tag (any match) */
  tags?: string[];
  limit?: number;
  offset?: number;
}

export async function listAssets(params: ListAssetsParams = {}): Promise<Asset[]> {
  const qs = new URLSearchParams();
  if (params.type) {
    const types = Array.isArray(params.type) ? params.type : [params.type];
    types.forEach((t) => qs.append("type", t));
  }
  if (params.scope === "mine") qs.set("visibility", "private");
  if (params.scope === "public") qs.set("visibility", "public");
  if (params.query) qs.set("query", params.query);
  if (params.limit) qs.set("limit", String(params.limit));

  try {
    const res = await fetch(`/api/assets?${qs.toString()}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface UploadAssetInput {
  file: File;
  name?: string;
  type: AssetType;
  visibility?: AssetVisibility;
  tags?: string[];
  description?: string;
  thumbnailUrl?: string;
}

export async function uploadAsset(input: UploadAssetInput): Promise<Asset | null> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("bucket", BUCKET);

  try {
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) return null;
    const { url } = await uploadRes.json();

    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name?.trim() || input.file.name,
        type: input.type,
        url,
        storage_path: url,
        thumbnail_url: input.thumbnailUrl,
        mime_type: input.file.type,
        size_bytes: input.file.size,
        visibility: input.visibility || "private",
        tags: input.tags || [],
        description: input.description,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateAsset(id: string, patch: Partial<Pick<Asset, "name" | "visibility" | "tags" | "description">>): Promise<boolean> {
  try {
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAsset(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  avatar: "Avatar",
  image: "Gambar",
  video: "Video",
  audio: "Audio",
  model_3d: "Model 3D",
  document: "Dokumen",
  other: "Lainnya",
};

/** Map a MIME type to the most likely AssetType. */
export function inferAssetType(file: File): AssetType {
  const m = file.type.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  const name = file.name.toLowerCase();
  if (name.endsWith(".glb") || name.endsWith(".gltf") || name.endsWith(".usdz")) return "model_3d";
  if (name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")) return "document";
  return "other";
}

/** Accept attribute helper for <input type="file"> based on AssetType */
export function acceptForAssetType(type: AssetType | "all"): string | undefined {
  switch (type) {
    case "avatar":
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "model_3d":
      return ".glb,.gltf,.usdz,model/*";
    case "document":
      return ".pdf,.doc,.docx,application/pdf";
    case "all":
    case "other":
    default:
      return undefined;
  }
}
