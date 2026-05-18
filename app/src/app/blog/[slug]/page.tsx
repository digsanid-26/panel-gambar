"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, BookOpen, FileText, Loader2 } from "lucide-react";

interface Post {
  id: string; title: string; slug: string; excerpt?: string;
  content: string; type: string; status: string; cover_image_url?: string;
  published_at?: string; created_at: string;
  author?: { id: string; name: string; avatar_url?: string };
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${slug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setPost(data); setLoading(false); })
      .catch(() => { router.push("/blog"); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
    </div>
  );
  if (!post) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Kembali ke Blog</Button>
          </Link>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${post.type === "panduan" ? "bg-accent/15 text-accent-dark" : "bg-secondary/15 text-secondary-dark"}`}>
            {post.type === "panduan" ? <BookOpen className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {post.type === "panduan" ? "Panduan" : "Artikel"}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-4 leading-snug">{post.title}</h1>

        {post.excerpt && <p className="text-lg text-muted mb-4 leading-relaxed">{post.excerpt}</p>}

        <div className="flex items-center gap-4 text-sm text-muted mb-6 pb-6 border-b border-border">
          {post.author && (
            <Link href={`/teachers/${post.author.id}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              {post.author.avatar_url ? (
                <img src={post.author.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              {post.author.name}
            </Link>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.published_at ?? post.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
          </span>
        </div>

        {post.cover_image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img src={post.cover_image_url} alt={post.title} className="w-full object-cover max-h-80" />
          </div>
        )}

        {/* Article content */}
        <article
          className="prose prose-sm sm:prose max-w-none
            prose-headings:font-bold prose-headings:text-foreground
            prose-p:text-foreground/90 prose-p:leading-relaxed
            prose-a:text-primary prose-a:underline
            prose-blockquote:border-l-primary prose-blockquote:text-muted
            prose-code:bg-surface-alt prose-code:px-1 prose-code:rounded
            prose-img:rounded-xl prose-img:shadow"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </main>
    </div>
  );
}
