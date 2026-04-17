"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function CreateStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("umum");
  const [level, setLevel] = useState("dasar");
  const [targetClass, setTargetClass] = useState("Kelas 1-2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("stories")
      .insert({
        title,
        description,
        theme,
        level,
        target_class: targetClass,
        author_id: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/stories/${data.id}/edit`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Buat Cerita Baru</h1>
        </div>

        <div className="bg-surface-card rounded-2xl border border-border p-6 sm:p-8">
          <form onSubmit={handleCreate} className="space-y-5">
            <Input
              id="title"
              label="Judul Cerita"
              placeholder="Misal: Kelinci yang Rajin"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Textarea
              id="description"
              label="Deskripsi Singkat"
              placeholder="Ceritakan tentang apa cerita ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                id="theme"
                label="Tema"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                options={[
                  { value: "umum", label: "Umum" },
                  { value: "kehidupan-sehari-hari", label: "Kehidupan Sehari-hari" },
                  { value: "keluarga", label: "Keluarga & Persahabatan" },
                  { value: "sekolah", label: "Lingkungan Sekolah" },
                  { value: "hewan-alam", label: "Hewan & Alam" },
                  { value: "cerita-rakyat", label: "Cerita Rakyat & Fabel" },
                  { value: "petualangan", label: "Petualangan" },
                  { value: "sains", label: "Sains Sederhana" },
                  { value: "profesi", label: "Profesi & Cita-cita" },
                  { value: "budaya", label: "Budaya Indonesia" },
                  { value: "moral", label: "Nilai Moral & Karakter" },
                ]}
              />

              <Select
                id="level"
                label="Level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                options={[
                  { value: "pemula", label: "Pemula (Kelas 1)" },
                  { value: "dasar", label: "Dasar (Kelas 2)" },
                  { value: "menengah", label: "Menengah (Kelas 3)" },
                  { value: "mahir", label: "Mahir (Kelas 4)" },
                ]}
              />

              <Select
                id="targetClass"
                label="Target Kelas"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                options={[
                  { value: "Kelas 1-2", label: "Kelas 1-2 (Fase A)" },
                  { value: "Kelas 3-4", label: "Kelas 3-4 (Fase B)" },
                  { value: "Semua", label: "Semua Kelas" },
                ]}
              />
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/dashboard">
                <Button variant="outline" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Buat & Lanjut Edit Panel
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
