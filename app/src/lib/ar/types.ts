/**
 * Panel AR — Type definitions
 *
 * Untuk Fase A (MVP), data masih statis (seed). Saat database VM PostgreSQL
 * siap, tipe ini akan di-map ke tabel `ar_scenes`, `ar_markers`, `ar_assets`
 * sebagaimana didefinisikan di docs/prospek-ar-edukasi.md §5.2.
 */

export type ARSceneType = "marker" | "markerless" | "model-only";

/** Transformasi 3D dasar untuk aset */
export interface ARTransform {
  position?: [number, number, number];
  rotation?: [number, number, number]; // radians
  scale?: [number, number, number] | number;
}

/** Aset 3D yang dirender di dalam scene AR */
export interface ARAsset {
  id: string;
  /** URL file GLB/GLTF (bisa lokal /models/xxx.glb atau remote) */
  src: string;
  name: string;
  transform?: ARTransform;
  /** Nama animasi built-in glTF yang diputar otomatis (opsional) */
  animationName?: string;
  /** URL audio narasi/deskripsi yang diputar saat marker/scene aktif */
  audioUrl?: string;
  /** Trigger audio: auto (saat scene tampil) atau tap (saat user tap objek) */
  audioTrigger?: "auto" | "tap";
}

/** Scene AR — satu pengalaman AR */
export interface ARScene {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Jenis AR: marker (image tracking), markerless (WebXR), atau model-only (viewer 3D tanpa AR) */
  type: ARSceneType;

  /** Tema mata pelajaran — untuk filter & label */
  subject: "bahasa" | "ipas" | "seni" | "sosial" | "lainnya";
  level: "pemula" | "dasar" | "menengah" | "mahir";

  /** URL gambar cover (ditampilkan di galeri) */
  coverImage: string;

  /**
   * Untuk scene type = "marker":
   * - `markerImage`: URL gambar target (di-print di buku / kartu)
   * - `markerMindFile`: URL file .mind hasil kompilasi MindAR (opsional, bisa null untuk demo)
   * Jika `markerMindFile` kosong, viewer akan mode "model-only" sebagai fallback.
   */
  markerImage?: string;
  markerMindFile?: string;

  /** Daftar aset yang muncul saat scene aktif */
  assets: ARAsset[];

  /** Instruksi singkat untuk siswa (misal: "Arahkan kamera ke halaman 12 buku") */
  instruction?: string;

  createdAt: string;
}
