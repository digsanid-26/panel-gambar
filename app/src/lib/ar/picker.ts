"use client";

/**
 * AR Scene Picker helper — menggabungkan seed scenes dengan scene
 * buatan user (localStorage) untuk dropdown pemilihan AR trigger.
 */

import { AR_SCENES } from "./seed";
import { listUserScenes } from "./storage";
import type { ARScene } from "./types";

export interface ARSceneOption {
  value: string; // slug
  label: string;
  owner: "seed" | "user";
  type: ARScene["type"];
}

export function listAllARScenes(): ARScene[] {
  const userScenes = listUserScenes();
  // User scenes first, then seed. Dedup by slug (user takes priority)
  const seen = new Set<string>();
  const result: ARScene[] = [];
  for (const s of [...userScenes, ...AR_SCENES]) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    result.push(s);
  }
  return result;
}

export function listARSceneOptions(): ARSceneOption[] {
  const userScenes = listUserScenes();
  const seedSlugs = new Set(AR_SCENES.map((s) => s.slug));
  const options: ARSceneOption[] = [];

  for (const s of userScenes) {
    options.push({
      value: s.slug,
      label: s.title,
      owner: "user",
      type: s.type,
    });
  }
  for (const s of AR_SCENES) {
    if (userScenes.some((u) => u.slug === s.slug)) continue;
    options.push({
      value: s.slug,
      label: s.title,
      owner: "seed",
      type: s.type,
    });
    seedSlugs.add(s.slug);
  }
  return options;
}

/** Dapatkan scene by slug dari gabungan seed + user. */
export function findARSceneBySlug(slug: string): ARScene | undefined {
  return listAllARScenes().find((s) => s.slug === slug);
}
