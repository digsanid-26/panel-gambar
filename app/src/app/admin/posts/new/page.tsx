"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { ArrowLeft, Save, Loader2, Eye } from "lucide-react";

export default function NewPostPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("artikel");
  const [postStatus, setPostStatus] = useState("draft");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    if ((session.user as any).role !== "admin") { router.push("/dashboard"); return; }
  }, [session, status]);

  useEffect(() => {
    if (!slugManual) {
      setSlug(title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s]+/g, "-").slice(0, 80));
    }
  }, [title, slugManual]);

  async function handleSave(status: string) {
    if (!title.trim()) { setError("Judul wajib diisi."); return; }
    setError("");
    setSaving(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, excerpt, content, type, status, cover_image_url: coverUrl || null }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/posts/${data.id}/edit`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Gagal menyimpan.");
    }
    setSaving(false);
  }

  async function handleCoverUpload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) { const { url } = await res.json(); setCoverUrl(url); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/posts">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="flex-1 text-2xl font-bold">Buat Konten Baru</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Draft
            </Button>
            <Button variant="primary" onClick={() => handleSave("published")} disabled={saving}>
              <Eye className="w-4 h-4" /> Publikasikan
            </Button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">{error}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Input label="Judul" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul artikel atau panduan..." />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Slug URL</label>
              <div className="flex gap-2">
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="slug-url-artikel"
                />
              </div>
              <p className="text-xs text-muted mt-1">padu.digsan.id/blog/<span className="text-foreground">{slug || "..."}</span></p>
            </div>
            <Textarea label="Ringkasan (opsional)" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Deskripsi singkat yang muncul di daftar artikel..." rows={3} />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Konten</label>
              <RichTextEditor value={content} onChange={setContent} placeholder="Mulai menulis konten artikel..." minHeight="400px" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-surface-card border border-border rounded-xl p-4 space-y-4">
              <Select
                label="Tipe"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[{ value: "artikel", label: "Artikel" }, { value: "panduan", label: "Panduan" }]}
              />
              <Select
                label="Status"
                value={postStatus}
                onChange={(e) => setPostStatus(e.target.value)}
                options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Dipublikasi" }]}
              />
            </div>
            <div className="bg-surface-card border border-border rounded-xl p-4">
              <label className="block text-sm font-semibold mb-3">Gambar Cover</label>
              <CoverImageUploader
                currentUrl={coverUrl || undefined}
                onUpload={handleCoverUpload}
                onRemove={() => setCoverUrl("")}
                onPickFromLibrary={(url) => setCoverUrl(url)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
