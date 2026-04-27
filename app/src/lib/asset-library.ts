"use client";

import { createClient } from "@/lib/supabase/client";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase.from("assets").select("*").order("created_at", { ascending: false });

  if (params.type) {
    if (Array.isArray(params.type)) {
      q = q.in("type", params.type);
    } else {
      q = q.eq("type", params.type);
    }
  }

  switch (params.scope) {
    case "mine":
      q = q.eq("owner_id", user.id);
      break;
    case "public":
      q = q.eq("visibility", "public");
      break;
    case "all":
    default:
      // RLS already returns mine + public; nothing extra needed
      break;
  }

  if (params.query && params.query.trim()) {
    const term = `%${params.query.trim()}%`;
    q = q.or(`name.ilike.${term},description.ilike.${term}`);
  }

  if (params.tags && params.tags.length > 0) {
    q = q.overlaps("tags", params.tags);
  }

  if (typeof params.limit === "number") q = q.limit(params.limit);
  if (typeof params.offset === "number" && typeof params.limit === "number") {
    q = q.range(params.offset, params.offset + params.limit - 1);
  }

  const { data, error } = await q;
  if (error) {
    console.error("listAssets error", error);
    return [];
  }
  return (data || []) as Asset[];
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user.id}/${input.type}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });

  if (upErr) {
    console.error("uploadAsset storage error", upErr);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("assets")
    .insert({
      owner_id: user.id,
      name: input.name?.trim() || input.file.name,
      type: input.type,
      url: publicUrl,
      storage_path: path,
      storage_bucket: BUCKET,
      thumbnail_url: input.thumbnailUrl,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      visibility: input.visibility || "private",
      tags: input.tags || [],
      description: input.description,
    })
    .select()
    .single();

  if (error) {
    console.error("uploadAsset insert error", error);
    // Best effort cleanup
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }

  return data as Asset;
}

export async function updateAsset(id: string, patch: Partial<Pick<Asset, "name" | "visibility" | "tags" | "description">>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("assets").update(patch).eq("id", id);
  if (error) {
    console.error("updateAsset error", error);
    return false;
  }
  return true;
}

export async function deleteAsset(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: row } = await supabase.from("assets").select("storage_path,storage_bucket").eq("id", id).single();
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) {
    console.error("deleteAsset error", error);
    return false;
  }
  if (row?.storage_path) {
    await supabase.storage.from(row.storage_bucket || BUCKET).remove([row.storage_path]);
  }
  return true;
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
