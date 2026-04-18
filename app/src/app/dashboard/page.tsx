"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, Story, ClassRoom } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  PlusCircle,
  Users,
  Mic,
  Clock,
  FileText,
  Loader2,
  Copy,
  Check,
  Radio,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) { router.push("/login"); return; }
      setUser(profile as UserProfile);

      if (profile.role === "guru") {
        const { data: myStories } = await supabase
          .from("stories")
          .select("*, panels(count)")
          .eq("author_id", authUser.id)
          .order("updated_at", { ascending: false })
          .limit(5);
        if (myStories) setStories(myStories as Story[]);

        const { data: myClasses } = await supabase
          .from("classrooms")
          .select("*, classroom_members(count)")
          .eq("teacher_id", authUser.id)
          .order("created_at", { ascending: false });
        if (myClasses) setClassrooms(myClasses as ClassRoom[]);
      } else {
        const { data: published } = await supabase
          .from("stories")
          .select("*, profiles!stories_author_id_fkey(name)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(10);
        if (published) setStories(published as Story[]);
      }

      setLoading(false);
    }
    load();
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Halo, {user.name}! 👋
            </h1>
            <p className="text-muted text-sm mt-1">
              {user.role === "guru"
                ? "Kelola cerita dan pantau perkembangan siswa Anda."
                : "Baca cerita dan rekam suaramu!"}
            </p>
          </div>
          {user.role === "guru" && (
            <Link href="/stories/create">
              <Button variant="primary">
                <PlusCircle className="w-4 h-4" />
                Buat Cerita Baru
              </Button>
            </Link>
          )}
        </div>

        {/* Guru Dashboard */}
        {user.role === "guru" && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Cerita", value: stories.length, icon: BookOpen, color: "text-primary bg-primary/10" },
                { label: "Terbit", value: stories.filter((s) => s.status === "published").length, icon: FileText, color: "text-accent bg-accent/10" },
                { label: "Kelas", value: classrooms.length, icon: Users, color: "text-secondary bg-secondary/10" },
                { label: "Draft", value: stories.filter((s) => s.status === "draft").length, icon: Clock, color: "text-muted bg-surface-alt" },
              ].map((s, i) => (
                <div key={i} className="bg-surface-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* My Stories */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Cerita Saya</h2>
                <Link href="/stories" className="text-sm text-primary font-semibold hover:underline">
                  Lihat semua
                </Link>
              </div>
              {stories.length === 0 ? (
                <div className="bg-surface-card rounded-xl border border-border p-8 text-center">
                  <BookOpen className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted">Belum ada cerita. Buat cerita pertama Anda!</p>
                  <Link href="/stories/create">
                    <Button variant="primary" size="sm" className="mt-4">
                      <PlusCircle className="w-4 h-4" />
                      Buat Cerita
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stories.map((story) => (
                    <Link key={story.id} href={`/stories/${story.id}`}>
                      <div className="bg-surface-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all h-full">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant={story.status === "published" ? "accent" : "outline"}>
                            {story.status === "published" ? "Terbit" : "Draft"}
                          </Badge>
                          <Badge variant="secondary">{story.level}</Badge>
                        </div>
                        <h3 className="font-bold text-base mb-1 line-clamp-2">{story.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">{story.description}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {story.target_class}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Live Session */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Sesi Baca Bersama</h2>
                <Link href="/live" className="text-sm text-primary font-semibold hover:underline">
                  Lihat semua
                </Link>
              </div>
              <div className="bg-gradient-to-r from-danger/5 to-primary/5 rounded-xl border border-danger/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                    <Radio className="w-6 h-6 text-danger" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Baca Bersama Real-time</h3>
                    <p className="text-sm text-muted">
                      Buat sesi baca bersama dengan siswa. Semua device tersinkronisasi dengan suara langsung.
                    </p>
                  </div>
                  <Link href="/live/create">
                    <Button variant="primary" size="sm">
                      <Radio className="w-4 h-4" />
                      Buat Sesi
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* My Classes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Kelas Saya</h2>
              </div>
              {classrooms.length === 0 ? (
                <div className="bg-surface-card rounded-xl border border-border p-8 text-center">
                  <Users className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted">Belum ada kelas. Buat kelas untuk mengundang siswa.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classrooms.map((cls) => (
                    <div key={cls.id} className="bg-surface-card rounded-xl border border-border p-5">
                      <h3 className="font-bold text-base mb-2">{cls.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted mb-3">
                        <span>Kode Kelas:</span>
                        <code className="bg-surface-alt px-2 py-0.5 rounded font-mono text-foreground font-bold">
                          {cls.code}
                        </code>
                        <button onClick={() => copyCode(cls.code)} className="text-primary hover:text-primary-dark">
                          {copiedCode === cls.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted">
                        {(cls as unknown as { classroom_members: { count: number }[] }).classroom_members?.[0]?.count || 0} siswa
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Siswa Dashboard */}
        {user.role === "siswa" && (
          <div className="space-y-8">
            {/* Live Session Join */}
            <section>
              <div className="bg-gradient-to-r from-danger/5 to-secondary/5 rounded-xl border border-danger/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                    <Radio className="w-6 h-6 text-danger" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">Sesi Baca Bersama</h3>
                    <p className="text-sm text-muted">
                      Gabung sesi baca bersama dari guru dengan kode sesi.
                    </p>
                  </div>
                  <Link href="/live">
                    <Button variant="secondary" size="sm">
                      <Radio className="w-4 h-4" />
                      Gabung Sesi
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Available Stories */}
            <section>
              <h2 className="text-lg font-bold mb-4">Cerita Tersedia</h2>
              {stories.length === 0 ? (
                <div className="bg-surface-card rounded-xl border border-border p-8 text-center">
                  <BookOpen className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted">Belum ada cerita yang tersedia.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stories.map((story) => (
                    <Link key={story.id} href={`/stories/${story.id}`}>
                      <div className="bg-surface-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all h-full">
                        {story.cover_image_url ? (
                          <div className="w-full aspect-[3/2] rounded-lg bg-surface-alt mb-3 overflow-hidden">
                            <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[3/2] rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 mb-3 flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-primary/40" />
                          </div>
                        )}
                        <Badge variant="secondary" className="mb-2">{story.level}</Badge>
                        <h3 className="font-bold text-base mb-1 line-clamp-2">{story.title}</h3>
                        <p className="text-sm text-muted line-clamp-2">{story.description}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                          <span>{story.target_class}</span>
                          <span className="flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            Baca & Rekam
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
