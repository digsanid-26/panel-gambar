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

// ----------------- File API (local storage) -----------------

/**
 * Upload file ke local storage dan return public URL.
 */
export async function saveARFile(file: Blob, hintName?: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file instanceof File ? file : new File([file], hintName || "file"));
  formData.append("bucket", BUCKET);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload gagal");
  const { url } = await res.json();
  return url;
}

export async function deleteARFile(url: string | undefined | null): Promise<void> {
  if (!url) return;
  if (url.startsWith(IDB_URL_PREFIX)) return;
  // Local files: no server-side deletion needed for now
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

// ----------------- Scene metadata API -----------------

export async function listUserScenes(): Promise<ARScene[]> {
  try {
    const res = await fetch("/api/ar?scope=mine");
    if (!res.ok) return [];
    const data = await res.json();
    return (data as ARSceneRow[]).map(rowToScene);
  } catch { return []; }
}

export async function listPublishedARScenes(): Promise<ARScene[]> {
  try {
    const res = await fetch("/api/ar?scope=public");
    if (!res.ok) return [];
    const data = await res.json();
    return (data as ARSceneRow[]).map(rowToScene);
  } catch { return []; }
}

export async function getUserScene(idOrSlug: string): Promise<ARScene | undefined> {
  try {
    const res = await fetch(`/api/ar/${encodeURIComponent(idOrSlug)}`);
    if (!res.ok) return undefined;
    return rowToScene(await res.json());
  } catch { return undefined; }
}

export async function saveUserScene(scene: ARScene): Promise<void> {
  const method = scene.id ? "PUT" : "POST";
  const url = scene.id ? `/api/ar/${scene.id}` : "/api/ar";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sceneToRowPayload(scene, null)),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error("Gagal menyimpan scene: " + (e.error ?? res.statusText));
  }
}

export async function deleteUserScene(id: string): Promise<void> {
  const res = await fetch(`/api/ar/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Gagal menghapus scene");
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
