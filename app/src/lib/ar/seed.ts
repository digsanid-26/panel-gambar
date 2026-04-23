import type { ARScene } from "./types";

/**
 * Seed data untuk Fase A (MVP) Panel AR.
 *
 * Model 3D menggunakan KhronosGroup glTF Sample Models via jsDelivr CDN
 * (lisensi: CC-BY 4.0 / CC0 / Public Domain, aman untuk demo edukasi).
 *
 * Saat VM PostgreSQL siap, data ini akan dipindah ke tabel `ar_scenes`.
 * Untuk mengganti ke konten lokal, letakkan file GLB di `public/models/`
 * lalu ubah `src` ke `/models/nama-file.glb`.
 */

const CDN = "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models";

export const AR_SCENES: ARScene[] = [
  {
    id: "demo-peta-indonesia",
    slug: "peta-indonesia",
    title: "Peta Indonesia 3D",
    description:
      "Jelajahi bentuk kepulauan Indonesia dalam tampilan 3D. Putar, perbesar, dan pelajari letak pulau-pulau utama.",
    type: "model-only",
    subject: "sosial",
    level: "dasar",
    coverImage:
      "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=800&q=80",
    instruction:
      "Seret untuk memutar peta. Cubit untuk memperbesar. Ketuk tombol ▶ untuk mendengarkan narasi.",
    assets: [
      {
        id: "a1",
        name: "Globe",
        // Using a simple globe placeholder from KhronosGroup samples
        src: `${CDN}/Duck/glTF-Binary/Duck.glb`,
        transform: { scale: 1.5, position: [0, 0, 0] },
        audioTrigger: "auto",
      },
    ],
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "demo-rumah-adat",
    slug: "rumah-adat-tongkonan",
    title: "Rumah Adat Tongkonan",
    description:
      "Rumah adat khas suku Toraja dari Sulawesi Selatan. Perhatikan bentuk atap yang menyerupai perahu.",
    type: "model-only",
    subject: "sosial",
    level: "dasar",
    coverImage:
      "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=800&q=80",
    instruction:
      "Putar model untuk melihat rumah adat Tongkonan dari berbagai sudut.",
    assets: [
      {
        id: "a1",
        name: "Tongkonan",
        // Placeholder — ganti dengan model Tongkonan custom di production
        src: `${CDN}/BoxAnimated/glTF-Binary/BoxAnimated.glb`,
        transform: { scale: 1.0 },
        animationName: undefined,
      },
    ],
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "demo-hewan-komodo",
    slug: "hewan-khas-komodo",
    title: "Komodo — Hewan Khas Indonesia",
    description:
      "Komodo adalah kadal terbesar di dunia yang hanya hidup di Indonesia. Amati bentuk tubuh dan cakarnya.",
    type: "model-only",
    subject: "ipas",
    level: "dasar",
    coverImage:
      "https://images.unsplash.com/photo-1629808203550-95fc48aa38b2?w=800&q=80",
    instruction:
      "Putar dan perbesar untuk melihat detail tubuh komodo.",
    assets: [
      {
        id: "a1",
        name: "Komodo",
        src: `${CDN}/Fox/glTF-Binary/Fox.glb`,
        transform: { scale: 0.05 },
        animationName: "Run",
        audioTrigger: "auto",
      },
    ],
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "demo-alat-musik-angklung",
    slug: "alat-musik-angklung",
    title: "Angklung — Alat Musik Tradisional",
    description:
      "Angklung adalah alat musik tradisional dari Jawa Barat yang terbuat dari bambu.",
    type: "model-only",
    subject: "seni",
    level: "dasar",
    coverImage:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80",
    instruction:
      "Putar model angklung untuk melihat bagian-bagiannya.",
    assets: [
      {
        id: "a1",
        name: "Angklung",
        src: `${CDN}/DamagedHelmet/glTF-Binary/DamagedHelmet.glb`,
        transform: { scale: 1.0 },
      },
    ],
    createdAt: "2025-01-04T00:00:00Z",
  },
];

export function findARScene(idOrSlug: string): ARScene | undefined {
  return AR_SCENES.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

/** ID scene hasil seed (read-only, tidak bisa di-edit user). */
export function isSeedScene(idOrSlug: string): boolean {
  return !!findARScene(idOrSlug);
}
