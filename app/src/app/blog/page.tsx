"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { BookOpen, FileText, Calendar, User, ArrowRight } from "lucide-react";

interface Post {
  id: string; title: string; slug: string; excerpt?: string;
  type: string; status: string; cover_image_url?: string;
  published_at?: string; created_at: string;
  author?: { name: string; avatar_url?: string };
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "artikel" | "panduan">("all");

  useEffect(() => {
    fetch("/api/posts?status=published")
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = typeFilter === "all" ? posts : posts.filter((p) => p.type === typeFilter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Artikel & Panduan</h1>
          <p className="text-muted">Temukan artikel dan panduan seputar pembelajaran berbasis cerita bergambar.</p>
        </div>

        <div className="flex gap-2 mb-8">
          {(["all", "artikel", "panduan"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === t ? "bg-primary text-white" : "bg-surface-alt text-muted hover:text-foreground"
              }`}
            >
              {t === "panduan" && <BookOpen className="w-3.5 h-3.5" />}
              {t === "artikel" && <FileText className="w-3.5 h-3.5" />}
              {t === "all" ? "Semua" : t === "artikel" ? "Artikel" : "Panduan"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-surface-alt" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-surface-alt rounded w-3/4" />
                  <div className="h-3 bg-surface-alt rounded w-full" />
                  <div className="h-3 bg-surface-alt rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Belum ada {typeFilter === "all" ? "konten" : typeFilter} yang dipublikasi.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group bg-surface-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all">
                <div className="aspect-video bg-surface-alt overflow-hidden">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {post.type === "panduan" ? <BookOpen className="w-10 h-10 text-muted" /> : <FileText className="w-10 h-10 text-muted" />}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${post.type === "panduan" ? "bg-accent/15 text-accent-dark" : "bg-secondary/15 text-secondary-dark"}`}>
                      {post.type === "panduan" ? "Panduan" : "Artikel"}
                    </span>
                  </div>
                  <h2 className="font-bold mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-muted line-clamp-2 mb-3">{post.excerpt}</p>}
                  <div className="flex items-center justify-between text-xs text-muted mt-auto">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />{post.author?.name ?? "Admin"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at ?? post.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
