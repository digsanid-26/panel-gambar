"use client";

/**
 * AR Scene Picker — menggabungkan seed scenes (frontend static) dengan
 * user/published scenes (Supabase).
 *
 * Semua fungsi async karena scene user ada di DB.
 */

import { AR_SCENES, findARScene as findSeedScene } from "./seed";
import { listPublishedARScenes, listUserScenes, getUserScene } from "./storage";
import type { ARScene } from "./types";

export interface ARSceneOption {
  value: string; // slug
  label: string;
  owner: "seed" | "user";
  type: ARScene["type"];
}

/** Gabungan semua scene yang relevan untuk pengguna saat ini:
 *  scene buatan sendiri (author) + scene published publik + seed. */
export async function listAllARScenes(): Promise<ARScene[]> {
  const [mine, published] = await Promise.all([
    listUserScenes().catch(() => [] as ARScene[]),
    listPublishedARScenes().catch(() => [] as ARScene[]),
  ]);
  const seen = new Set<string>();
  const result: ARScene[] = [];
  for (const s of [...mine, ...published, ...AR_SCENES]) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    result.push(s);
  }
  return result;
}

export async function listARSceneOptions(): Promise<ARSceneOption[]> {
  const [mine, published] = await Promise.all([
    listUserScenes().catch(() => [] as ARScene[]),
    listPublishedARScenes().catch(() => [] as ARScene[]),
  ]);
  const options: ARSceneOption[] = [];
  const seen = new Set<string>();

  for (const s of mine) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    options.push({ value: s.slug, label: s.title, owner: "user", type: s.type });
  }
  for (const s of published) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    options.push({ value: s.slug, label: s.title, owner: "user", type: s.type });
  }
  for (const s of AR_SCENES) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    options.push({ value: s.slug, label: s.title, owner: "seed", type: s.type });
  }
  return options;
}

/** Dapatkan scene by slug: seed dulu (cepat, lokal) → fallback Supabase. */
export async function findARSceneBySlug(slug: string): Promise<ARScene | undefined> {
  const seed = findSeedScene(slug);
  if (seed) return seed;
  return await getUserScene(slug);
}
