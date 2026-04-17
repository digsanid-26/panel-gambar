"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { LiveSession, UserProfile } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Radio,
  Users,
  BookOpen,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function LivePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

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

      // Load active sessions
      if (profile.role === "guru") {
        const { data } = await supabase
          .from("live_sessions")
          .select("*, stories(title, level)")
          .eq("host_id", authUser.id)
          .in("status", ["waiting", "active"])
          .order("created_at", { ascending: false });
        if (data) setSessions(data as unknown as LiveSession[]);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoining(true);

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Masukkan kode sesi.");
      setJoining(false);
      return;
    }

    const { data, error } = await supabase
      .from("live_sessions")
      .select("id, status")
      .eq("code", code)
      .single();

    if (error || !data) {
      setJoinError("Kode sesi tidak ditemukan.");
      setJoining(false);
      return;
    }

    if (data.status === "finished") {
      setJoinError("Sesi ini sudah berakhir.");
      setJoining(false);
      return;
    }

    router.push(`/live/${data.id}`);
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
            <Radio className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sesi Baca Bersama</h1>
            <p className="text-sm text-muted">
              Baca cerita bersama secara real-time dengan suara langsung
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Join Session */}
          <div className="bg-surface-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Gabung Sesi
            </h2>
            <p className="text-sm text-muted mb-4">
              Masukkan kode sesi yang diberikan oleh guru untuk bergabung.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <Input
                placeholder="Masukkan kode sesi (mis: ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-center font-mono text-lg tracking-widest"
                maxLength={8}
              />
              {joinError && (
                <p className="text-sm text-danger">{joinError}</p>
              )}
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Gabung
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Create Session (Guru only) */}
          {user?.role === "guru" && (
            <div className="bg-surface-card rounded-2xl border border-border p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Buat Sesi Baru
              </h2>
              <p className="text-sm text-muted mb-4">
                Pilih cerita dan buat ruang sesi baca bersama untuk siswa Anda.
              </p>
              <Link href="/live/create">
                <Button variant="primary" className="w-full">
                  <Plus className="w-4 h-4" />
                  Buat Sesi Baca Bersama
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Active sessions (Guru) */}
        {user?.role === "guru" && sessions.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold mb-4">Sesi Aktif Saya</h2>
            <div className="space-y-3">
              {sessions.map((s) => (
                <Link key={s.id} href={`/live/${s.id}`}>
                  <div className="bg-surface-card rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {(s as unknown as { stories: { title: string } }).stories?.title || "Cerita"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={s.status === "active" ? "accent" : "outline"}
                          >
                            {s.status === "active" ? "Berlangsung" : "Menunggu"}
                          </Badge>
                          <span className="text-xs text-muted font-mono">
                            {s.code}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
