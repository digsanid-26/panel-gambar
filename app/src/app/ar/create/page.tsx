"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateSceneId, saveUserScene, slugify } from "@/lib/ar/storage";
import type { ARScene, ARSceneType } from "@/lib/ar/types";
import { ArrowLeft, Box, Camera, Sparkles } from "lucide-react";

const SUBJECTS: { value: ARScene["subject"]; label: string }[] = [
  { value: "bahasa", label: "Bahasa Indonesia" },
  { value: "ipas", label: "IPAS" },
  { value: "sosial", label: "IPS / Sosial" },
  { value: "seni", label: "Seni Budaya" },
  { value: "lainnya", label: "Lainnya" },
];

const LEVELS: { value: ARScene["level"]; label: string }[] = [
  { value: "pemula", label: "Pemula" },
  { value: "dasar", label: "Dasar" },
  { value: "menengah", label: "Menengah" },
  { value: "mahir", label: "Mahir" },
];

const TYPES: { value: ARSceneType; label: string; desc: string; icon: typeof Box }[] = [
  {
    value: "model-only",
    label: "Model 3D",
    desc: "Objek 3D yang bisa diputar & diperbesar. Cocok untuk eksplorasi objek.",
    icon: Box,
  },
  {
    value: "marker",
    label: "AR Marker",
    desc: "Objek 3D muncul saat kamera mengarah ke gambar di buku / kartu.",
    icon: Camera,
  },
];

export default function CreateARScenePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ARSceneType>("model-only");
  const [subject, setSubject] = useState<ARScene["subject"]>("lainnya");
  const [level, setLevel] = useState<ARScene["level"]>("dasar");
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);

    const id = generateSceneId();
    const slug = slugify(title);

    const scene: ARScene = {
      id,
      slug,
      title: title.trim(),
      description: description.trim() || "Deskripsi belum diisi.",
      type,
      subject,
      level,
      coverImage: "",
      assets: [],
      instruction: "",
    };

    try {
      await saveUserScene(scene);
      router.push(`/ar/${slug}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan scene.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href="/ar"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Galeri AR
        </Link>

        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Buat Scene AR Baru
            </h1>
          </div>
          <p className="text-xs text-muted">
            Setelah membuat, Anda akan diarahkan ke editor untuk menambah model 3D, audio, dan marker.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Judul Scene <span className="text-danger">*</span>
            </label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Tata Surya 3D"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Deskripsi
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Deskripsi singkat tentang scene ini..."
            />
          </div>

          {/* Type selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tipe Scene
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface-alt hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted"}`} />
                      <span className="font-semibold text-sm">{t.label}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-snug">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject + Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Mata Pelajaran
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as ARScene["subject"])}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Tingkat
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ARScene["level"])}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <Link href="/ar">
              <Button type="button" variant="ghost">
                Batal
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={submitting || !title.trim()}>
              Buat & Lanjut Edit
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
