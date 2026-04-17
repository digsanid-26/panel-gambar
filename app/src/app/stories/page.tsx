"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Story } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  PlusCircle,
  Loader2,
  Filter,
} from "lucide-react";

const LEVELS = [
  { value: "", label: "Semua Level" },
  { value: "pemula", label: "Pemula" },
  { value: "dasar", label: "Dasar" },
  { value: "menengah", label: "Menengah" },
  { value: "mahir", label: "Mahir" },
];

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }

      let query = supabase
        .from("stories")
        .select("*, profiles!stories_author_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (!user) {
        query = query.eq("status", "published");
      }

      const { data } = await query;
      if (data) {
        setStories(
          data.map((s: Record<string, unknown>) => ({
            ...s,
            author_name: (s.profiles as { name: string } | null)?.name || "Anonim",
          })) as Story[]
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = stories.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !levelFilter || s.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Cerita</h1>
          {userRole === "guru" && (
            <Link href="/stories/create">
              <Button variant="primary">
                <PlusCircle className="w-4 h-4" />
                Buat Cerita Baru
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              placeholder="Cari judul atau deskripsi cerita..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <div className="flex gap-1">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevelFilter(l.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    levelFilter === l.value
                      ? "bg-primary text-background"
                      : "bg-surface-card border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Story grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-card rounded-xl border border-border p-12 text-center">
            <BookOpen className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Belum Ada Cerita</h3>
            <p className="text-muted text-sm">
              {search || levelFilter
                ? "Tidak ditemukan cerita yang cocok. Coba ubah filter pencarian."
                : "Cerita belum tersedia."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <div className="bg-surface-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all h-full flex flex-col">
                  {story.cover_image_url ? (
                    <div className="w-full h-40 bg-surface-alt overflow-hidden">
                      <img
                        src={story.cover_image_url}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-primary/30" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={
                          story.status === "published" ? "accent" : "outline"
                        }
                      >
                        {story.status === "published" ? "Terbit" : "Draft"}
                      </Badge>
                      <Badge variant="secondary">{story.level}</Badge>
                    </div>
                    <h3 className="font-bold text-base mb-1 line-clamp-2">
                      {story.title}
                    </h3>
                    <p className="text-sm text-muted line-clamp-2 flex-1">
                      {story.description}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted">
                        {story.target_class}
                      </span>
                      <span className="text-xs text-muted">
                        oleh {story.author_name || "Guru"}
                      </span>
                    </div>
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
