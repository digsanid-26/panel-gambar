"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { ARSceneEditor } from "@/components/ar-editor/ar-scene-editor";
import { getUserScene } from "@/lib/ar/storage";
import { isSeedScene } from "@/lib/ar/seed";
import type { ARScene } from "@/lib/ar/types";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function EditARScenePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [scene, setScene] = useState<ARScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "seed" | "missing">("loading");

  useEffect(() => {
    if (!slug) return;
    if (isSeedScene(slug)) {
      setStatus("seed");
      return;
    }
    const s = getUserScene(slug);
    if (s) {
      setScene(s);
      setStatus("ok");
    } else {
      setStatus("missing");
    }
  }, [slug]);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {status === "loading" && (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {status === "seed" && (
          <div className="max-w-xl mx-auto text-center py-12">
            <AlertCircle className="w-10 h-10 text-accent mx-auto mb-3" />
            <h1 className="text-xl font-heading font-bold mb-2">
              Scene ini tidak bisa diedit
            </h1>
            <p className="text-sm text-muted mb-6">
              &quot;{slug}&quot; adalah scene contoh bawaan (read-only).
              Untuk membuat scene sendiri, klik &quot;Buat Scene AR&quot; di galeri.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Link href="/ar">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                  Galeri AR
                </Button>
              </Link>
              <Link href="/ar/create">
                <Button variant="primary" size="sm">
                  Buat Scene AR Baru
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "missing" && (
          <div className="max-w-xl mx-auto text-center py-12">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
            <h1 className="text-xl font-heading font-bold mb-2">Scene tidak ditemukan</h1>
            <p className="text-sm text-muted mb-6">
              Slug &quot;{slug}&quot; tidak tersedia di penyimpanan lokal Anda.
            </p>
            <Link href="/ar">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke galeri
              </Button>
            </Link>
          </div>
        )}

        {status === "ok" && scene && <ARSceneEditor initialScene={scene} />}
      </main>
    </div>
  );
}
