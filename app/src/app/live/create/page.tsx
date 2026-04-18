"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Story } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Radio,
  Check,
} from "lucide-react";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateLiveSessionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("stories")
        .select("*, panels(count)")
        .eq("author_id", user.id)
        .eq("status", "published")
        .order("updated_at", { ascending: false });

      if (data) setStories(data as Story[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    if (!selectedStory) return;
    setError("");
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const code = generateCode();

    const { data, error: insertError } = await supabase
      .from("live_sessions")
      .insert({
        code,
        story_id: selectedStory,
        host_id: user.id,
        status: "waiting",
        current_panel_index: 0,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setCreating(false);
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
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/live">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Buat Sesi Baca Bersama</h1>
            <p className="text-sm text-muted">Pilih cerita untuk dibaca bersama</p>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="bg-surface-card rounded-2xl border border-border p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted mx-auto mb-3" />
            <h3 className="font-bold mb-2">Belum Ada Cerita Terbit</h3>
            <p className="text-sm text-muted mb-4">
              Anda perlu menerbitkan cerita terlebih dahulu sebelum membuat sesi.
            </p>
            <Link href="/stories/create">
              <Button variant="primary">Buat Cerita</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {stories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => setSelectedStory(story.id)}
                  className={`w-full text-left bg-surface-card rounded-xl border-2 p-4 transition-all flex items-center gap-4 ${
                    selectedStory === story.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {story.cover_image_url ? (
                    <img
                      src={story.cover_image_url}
                      alt=""
                      className="w-20 h-[54px] rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-[54px] rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-primary/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm line-clamp-1">
                      {story.title}
                    </h3>
                    <p className="text-xs text-muted line-clamp-1 mt-0.5">
                      {story.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {story.level}
                      </Badge>
                      <span className="text-[10px] text-muted">
                        {story.target_class}
                      </span>
                    </div>
                  </div>
                  {selectedStory === story.id && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-background" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger mb-4">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedStory || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  Buat Sesi & Mulai
                </>
              )}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
