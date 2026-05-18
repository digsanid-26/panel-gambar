"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Eye, BookOpen, FileText, Loader2, ArrowLeft,
} from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  cover_image_url?: string;
  published_at?: string;
  created_at: string;
  author?: { name: string };
}

export default function AdminPostsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "artikel" | "panduan">("all");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    if ((session.user as any).role !== "admin") { router.push("/dashboard"); return; }
    load();
  }, [session, status]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/posts");
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Hapus "${title}"?`)) return;
    setDeleting(id);
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((p) => p.filter((x) => x.id !== id));
    setDeleting(null);
  }

  const filtered = typeFilter === "all" ? posts : posts.filter((p) => p.type === typeFilter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Kelola Artikel & Panduan</h1>
            <p className="text-sm text-muted mt-0.5">Buat dan kelola konten blog publik</p>
          </div>
          <Link href="/admin/posts/new">
            <Button variant="primary"><Plus className="w-4 h-4" /> Buat Baru</Button>
          </Link>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 mb-5">
          {(["all", "artikel", "panduan"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === t ? "bg-primary text-white" : "bg-surface-alt text-muted hover:text-foreground"
              }`}
            >
              {t === "all" ? "Semua" : t === "artikel" ? "Artikel" : "Panduan"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada {typeFilter === "all" ? "konten" : typeFilter}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => (
              <div key={post.id} className="bg-surface-card border border-border rounded-xl p-4 flex items-start gap-4">
                {post.cover_image_url ? (
                  <img src={post.cover_image_url} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-surface-alt rounded-lg flex-shrink-0 flex items-center justify-center">
                    {post.type === "panduan" ? <BookOpen className="w-6 h-6 text-muted" /> : <FileText className="w-6 h-6 text-muted" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold truncate">{post.title}</span>
                    <Badge variant={post.type === "panduan" ? "accent" : "secondary"} className="text-xs">
                      {post.type === "panduan" ? "Panduan" : "Artikel"}
                    </Badge>
                    <Badge variant={post.status === "published" ? "primary" : "outline"} className="text-xs">
                      {post.status === "published" ? "Dipublikasi" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">/{post.slug} · {new Date(post.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {post.status === "published" && (
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <Button variant="ghost" size="icon" title="Lihat"><Eye className="w-4 h-4" /></Button>
                    </Link>
                  )}
                  <Link href={`/admin/posts/${post.id}/edit`}>
                    <Button variant="ghost" size="icon" title="Edit"><Pencil className="w-4 h-4" /></Button>
                  </Link>
                  <Button
                    variant="ghost" size="icon" title="Hapus"
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={deleting === post.id}
                  >
                    {deleting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-danger" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
