"use client";

/**
 * AR Storage — Supabase-backed (migration V5 required).
 *
 * - Scene metadata: tabel public.ar_scenes
 * - File: bucket storage `ar-assets` (public)
 *
 * Semua scene URL menjadi HTTPS langsung (public bucket), sehingga viewer
 * tidak perlu resolver khusus.
 *
 * Seed/demo scenes tetap didefinisikan di frontend (@/lib/ar/seed.ts).
 */

import type { ARScene } from "./types";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "ar-assets";

/** Kompatibilitas lama — tidak dipakai lagi, tapi ditahan agar import lama tidak pecah. */
export const IDB_URL_PREFIX = "idb://";

// ----------------- Row <-> ARScene mapping -----------------

interface ARSceneRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  type: ARScene["type"];
  cover_image: string | null;
  marker_image: string | null;
  marker_mind_file: string | null;
  instruction: string | null;
  assets: ARScene["assets"];
  author_id: string | null;
  status: "draft" | "published";
  visibility: "public" | "private";
  created_at: string;
  updated_at: string;
}

function rowToScene(row: ARSceneRow): ARScene {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    subject: row.subject as ARScene["subject"],
    level: row.level as ARScene["level"],
    type: row.type,
    coverImage: row.cover_image ?? "",
    markerImage: row.marker_image ?? undefined,
    markerMindFile: row.marker_mind_file ?? undefined,
    instruction: row.instruction ?? undefined,
    assets: (row.assets as ARScene["assets"]) ?? [],
    createdAt: row.created_at,
  };
}

function sceneToRowPayload(scene: ARScene, authorId: string | null) {
  return {
    id: scene.id,
    slug: scene.slug,
    title: scene.title,
    description: scene.description ?? "",
    subject: scene.subject ?? "lainnya",
    level: scene.level ?? "SD",
    type: scene.type,
    cover_image: scene.coverImage || null,
    marker_image: scene.markerImage || null,
    marker_mind_file: scene.markerMindFile || null,
    instruction: scene.instruction || null,
    assets: scene.assets ?? [],
    author_id: authorId,
  };
}

// ----------------- File API (Supabase Storage) -----------------

/**
 * Upload file ke bucket `ar-assets` dan return public HTTPS URL.
 * Path: `<userId>/<timestamp>-<hintName>`
 */
export async function saveARFile(file: Blob, hintName?: string): Promise<string> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "anon";

  const safeName = (hintName || "file").replace(/[^a-z0-9_.-]/gi, "_").slice(-80);
  const key = `${userId}/${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("[AR] upload failed", error);
    throw new Error("Upload gagal: " + error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

/** Ekstrak object key dari public URL Supabase Storage. */
function extractStorageKey(url: string): string | null {
  // Format: https://<project>.supabase.co/storage/v1/object/public/ar-assets/<key>
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function deleteARFile(url: string | undefined | null): Promise<void> {
  if (!url) return;
  // Handle sisa legacy idb:// dari klien lama — tidak ada aksi
  if (url.startsWith(IDB_URL_PREFIX)) return;
  const key = extractStorageKey(url);
  if (!key) return;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) {
    // Tidak fatal — bisa saja file sudah terhapus
    console.warn("[AR] delete file warn", error.message);
  }
}

/**
 * Kompatibilitas lama. Sekarang URL sudah HTTPS langsung, jadi cukup
 * dikembalikan apa adanya. Dipertahankan agar kode lama tidak rusak.
 */
export async function resolveARUrl(
  url: string | undefined
): Promise<string | undefined> {
  return url || undefined;
}

// ----------------- Scene metadata API (Supabase table) -----------------

export async function listUserScenes(): Promise<ARScene[]> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("ar_scenes")
    .select("*")
    .eq("author_id", uid)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[AR] listUserScenes", error);
    return [];
  }
  return (data as ARSceneRow[]).map(rowToScene);
}

/** List all published + public AR scenes (untuk gallery umum). */
export async function listPublishedARScenes(): Promise<ARScene[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ar_scenes")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[AR] listPublishedARScenes", error);
    return [];
  }
  return (data as ARSceneRow[]).map(rowToScene);
}

export async function getUserScene(idOrSlug: string): Promise<ARScene | undefined> {
  const supabase = createClient();
  // Coba by slug dulu (lebih umum dari URL), fallback id
  const { data, error } = await supabase
    .from("ar_scenes")
    .select("*")
    .or(`slug.eq.${idOrSlug},id.eq.${idOrSlug}`)
    .maybeSingle();
  if (error) {
    console.error("[AR] getUserScene", error);
    return undefined;
  }
  if (!data) return undefined;
  return rowToScene(data as ARSceneRow);
}

export async function saveUserScene(scene: ARScene): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  if (!uid) throw new Error("Belum login. Silakan login sebagai guru untuk menyimpan scene AR.");

  const payload = sceneToRowPayload(scene, uid);
  const { error } = await supabase.from("ar_scenes").upsert(payload, { onConflict: "id" });
  if (error) {
    console.error("[AR] saveUserScene", error);
    throw new Error("Gagal menyimpan scene: " + error.message);
  }
}

export async function deleteUserScene(id: string): Promise<void> {
  const supabase = createClient();
  // Ambil scene dulu agar bisa hapus file storage-nya
  const { data: target } = await supabase
    .from("ar_scenes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (target) {
    const scene = rowToScene(target as ARSceneRow);
    const urls: (string | undefined)[] = [
      scene.coverImage,
      scene.markerImage,
      scene.markerMindFile,
      ...scene.assets.flatMap((a) => [a.src, a.audioUrl]),
    ];
    await Promise.all(urls.map((u) => deleteARFile(u)));
  }

  const { error } = await supabase.from("ar_scenes").delete().eq("id", id);
  if (error) {
    console.error("[AR] deleteUserScene", error);
    throw new Error("Gagal menghapus scene: " + error.message);
  }
}

// ----------------- Helpers -----------------

export function generateSceneId(): string {
  // Gunakan UUID client-side agar aman dipakai sebagai primary key Supabase.
  // Supabase tabel punya default uuid_generate_v4(), tapi karena kita upsert
  // dengan id dari klien (untuk konsistensi editor → DB), kita buat di sini.
  return (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ?? fallbackUuid();
}

function fallbackUuid(): string {
  // RFC4122-ish fallback tanpa dependency
  const hex = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, "0");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${((Math.random() * 4) | 8).toString(16)}${hex(3)}-${hex(12)}`;
}

export function generateAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "scene-baru"
  );
}
