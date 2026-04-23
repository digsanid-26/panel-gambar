"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findARScene } from "@/lib/ar/seed";
import { ARSceneViewer } from "@/components/ar-viewer/ar-scene-viewer";
import { ArrowLeft, Sparkles } from "lucide-react";

const SUBJECT_LABELS: Record<string, string> = {
  bahasa: "Bahasa Indonesia",
  ipas: "IPAS",
  sosial: "IPS / Sosial",
  seni: "Seni Budaya",
  lainnya: "Lainnya",
};

export default function ARSceneDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const scene = findARScene(slug);

  if (!scene) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted mb-3 opacity-40" />
          <h1 className="text-xl font-heading font-bold mb-2">Scene AR tidak ditemukan</h1>
          <p className="text-sm text-muted mb-6">
            Scene dengan slug &quot;{slug}&quot; tidak tersedia.
          </p>
          <Link href="/ar">
            <Button variant="primary">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Galeri AR
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Back link */}
        <Link
          href="/ar"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Galeri AR
        </Link>

        {/* Header */}
        <header className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            {scene.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="primary">{SUBJECT_LABELS[scene.subject] ?? scene.subject}</Badge>
            <Badge variant="secondary">{scene.level}</Badge>
            <Badge variant="outline">
              {scene.type === "marker"
                ? "AR Marker"
                : scene.type === "markerless"
                ? "AR Ruangan"
                : "Model 3D"}
            </Badge>
          </div>
        </header>

        {/* Viewer */}
        <ARSceneViewer scene={scene} />

        {/* Description */}
        <section className="mt-6 p-4 rounded-xl bg-surface-card border border-border">
          <h2 className="font-heading font-semibold text-foreground mb-2">Tentang scene ini</h2>
          <p className="text-sm text-muted leading-relaxed">{scene.description}</p>
        </section>

        {/* Asset list (for transparency / debug) */}
        <section className="mt-4 text-xs text-muted">
          <p>
            <strong className="text-foreground">{scene.assets.length}</strong> aset 3D ·
            slug: <code className="px-1 py-0.5 rounded bg-surface-alt">{scene.slug}</code>
          </p>
        </section>
      </main>
    </div>
  );
}
