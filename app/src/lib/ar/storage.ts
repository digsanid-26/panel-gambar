"use client";

/**
 * AR Storage — penyimpanan scene buatan user.
 *
 * Fase B: semua data disimpan di browser (offline-first) sampai database
 * VM PostgreSQL siap.
 *
 * - localStorage (`ar_user_scenes_v1`): metadata ARScene tanpa konten file
 * - IndexedDB (`panel-ar-files` / store `files`): blob untuk GLB, gambar marker, audio
 *
 * URL pada ARScene (`assets[].src`, `markerImage`, dll) memakai format
 * internal `idb://<fileId>` — resolver mengubahnya menjadi `blob:` URL
 * via `resolveARUrl()` sebelum dirender.
 *
 * Saat database siap, layer ini diganti jadi call ke Supabase Storage /
 * MinIO; konsumer (editor & viewer) tidak perlu berubah.
 */

import type { ARScene } from "./types";

const LS_KEY = "ar_user_scenes_v1";
const DB_NAME = "panel-ar-files";
const STORE = "files";
const DB_VERSION = 1;
export const IDB_URL_PREFIX = "idb://";

// ----------------- IndexedDB wrapper -----------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDB();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// ----------------- Public file API -----------------

/** Simpan file dari File/Blob ke IndexedDB, return URL internal `idb://<id>` */
export async function saveARFile(file: Blob, hintName?: string): Promise<string> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${
    hintName ? "-" + hintName.replace(/[^a-z0-9_.-]/gi, "_").slice(-40) : ""
  }`;
  await idbPut(id, file);
  return IDB_URL_PREFIX + id;
}

export async function deleteARFile(idbUrl: string): Promise<void> {
  if (!idbUrl.startsWith(IDB_URL_PREFIX)) return;
  const id = idbUrl.slice(IDB_URL_PREFIX.length);
  try {
    await idbDelete(id);
  } catch {
    // ignore
  }
}

/**
 * Resolve URL internal `idb://<id>` menjadi blob URL yang dapat dipakai
 * <img>, <audio>, GLTFLoader, dll. URL non-idb dikembalikan apa adanya.
 *
 * Catatan: blob URL yang dikembalikan harus di-`URL.revokeObjectURL()`
 * oleh konsumer saat komponen unmount untuk menghindari memory leak.
 */
export async function resolveARUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (!url.startsWith(IDB_URL_PREFIX)) return url;
  const id = url.slice(IDB_URL_PREFIX.length);
  const blob = await idbGet(id);
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
}

// ----------------- Scene metadata (localStorage) -----------------

function readUserScenes(): ARScene[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ARScene[];
  } catch {
    return [];
  }
}

function writeUserScenes(scenes: ARScene[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(scenes));
}

export function listUserScenes(): ARScene[] {
  return readUserScenes();
}

export function getUserScene(idOrSlug: string): ARScene | undefined {
  return readUserScenes().find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

export function saveUserScene(scene: ARScene): void {
  const scenes = readUserScenes();
  const idx = scenes.findIndex((s) => s.id === scene.id);
  if (idx >= 0) {
    scenes[idx] = scene;
  } else {
    scenes.push(scene);
  }
  writeUserScenes(scenes);
}

export async function deleteUserScene(id: string): Promise<void> {
  const scenes = readUserScenes();
  const target = scenes.find((s) => s.id === id);
  if (!target) return;
  // Clean up IndexedDB files owned by this scene
  const urls: (string | undefined)[] = [
    target.coverImage,
    target.markerImage,
    target.markerMindFile,
    ...target.assets.flatMap((a) => [a.src, a.audioUrl]),
  ];
  await Promise.all(
    urls
      .filter((u): u is string => !!u && u.startsWith(IDB_URL_PREFIX))
      .map((u) => deleteARFile(u))
  );
  writeUserScenes(scenes.filter((s) => s.id !== id));
}

// ----------------- Helpers -----------------

export function generateSceneId(): string {
  return `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "scene-baru";
}
