"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { ArrowLeft, Save, Loader2, Eye, Trash2 } from "lucide-react";

interface Post {
  id: string; title: string; slug: string; excerpt?: string;
  content: string; type: string; status: string; cover_image_url?: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, status } = useSession();

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("artikel");
  const [postStatus, setPostStatus] = useState("draft");
  const [coverUrl, setCoverUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    if ((session.user as any).role !== "admin") { router.push("/dashboard"); return; }
    loadPost();
  }, [session, status]);

  async function loadPost() {
    const res = await fetch(`/api/posts/${postId}`);
    if (!res.ok) { router.push("/admin/posts"); return; }
    const data: Post = await res.json();
    setPost(data);
    setTitle(data.title);
    setSlug(data.slug);
    setExcerpt(data.excerpt ?? "");
    setContent(data.content);
    setType(data.type);
    setPostStatus(data.status);
    setCoverUrl(data.cover_image_url ?? "");
    setLoading(false);
  }

  async function handleSave(newStatus?: string) {
    if (!title.trim()) { setError("Judul wajib diisi."); return; }
    setError("");
    setSaving(true);
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, slug, excerpt, content, type,
        status: newStatus ?? postStatus,
        cover_image_url: coverUrl || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPostStatus(data.status);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Gagal menyimpan.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Hapus "${title}"?`)) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    router.push("/admin/posts");
  }

  async function handleCoverUpload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) { const { url } = await res.json(); setCoverUrl(url); }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/posts">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="flex-1 text-2xl font-bold truncate">Edit: {title}</h1>
          <div className="flex gap-2">
            <Button variant="danger" size="icon" onClick={handleDelete} title="Hapus"><Trash2 className="w-4 h-4" /></Button>
            {postStatus !== "published" && (
              <Button variant="outline" onClick={() => handleSave("published")} disabled={saving}>
                <Eye className="w-4 h-4" /> Publikasikan
              </Button>
            )}
            {postStatus === "published" && (
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
                Jadikan Draft
              </Button>
            )}
            <Button variant="primary" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan
            </Button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">{error}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Input label="Judul" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul artikel atau panduan..." />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Slug URL</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted mt-1">padu.digsan.id/blog/<span className="text-foreground">{slug || "..."}</span></p>
            </div>
            <Textarea label="Ringkasan (opsional)" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Deskripsi singkat..." rows={3} />
            <div>
              <label className="block text-sm font-semibold mb-1.5">Konten</label>
              <RichTextEditor value={content} onChange={setContent} placeholder="Tulis konten di sini..." minHeight="400px" />
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
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <p className={`text-sm font-medium ${postStatus === "published" ? "text-primary" : "text-muted"}`}>
                  {postStatus === "published" ? "✓ Dipublikasi" : "Draft"}
                </p>
              </div>
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
