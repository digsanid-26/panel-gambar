"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Story, Panel, Dialog, UserProfile } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Edit,
  Loader2,
  Maximize,
  Mic,
  Minimize,
  Volume2,
  Image as ImageIcon,
} from "lucide-react";

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<Story | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRecorder, setShowRecorder] = useState<string | null>(null);

  const supabase = createClient();
  const currentPanel = panels[currentIndex];

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (profile) setUser(profile as UserProfile);
      }

      const { data: storyData } = await supabase
        .from("stories")
        .select("*, profiles!stories_author_id_fkey(name)")
        .eq("id", storyId)
        .single();

      if (!storyData) {
        router.push("/stories");
        return;
      }

      setStory({
        ...storyData,
        author_name: (storyData.profiles as { name: string } | null)?.name,
      } as Story);

      const { data: panelsData } = await supabase
        .from("panels")
        .select("*, dialogs(*)")
        .eq("story_id", storyId)
        .order("order_index", { ascending: true });

      if (panelsData) {
        const sorted = panelsData.map((p: Record<string, unknown>) => ({
          ...p,
          dialogs: ((p.dialogs as Dialog[]) || []).sort(
            (a: Dialog, b: Dialog) => a.order_index - b.order_index
          ),
        }));
        setPanels(sorted as Panel[]);
      }

      setLoading(false);
    }
    load();
  }, [storyId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, panels.length]);

  const goNext = useCallback(() => {
    if (currentIndex < panels.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, panels.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  async function handleSaveRecording(blob: Blob, dialogId?: string) {
    if (!user || !currentPanel) return;

    const fileName = `${user.id}/${storyId}/${currentPanel.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, blob, { contentType: "audio/webm" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("Gagal menyimpan rekaman.");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("audio")
      .getPublicUrl(fileName);

    await supabase.from("recordings").insert({
      student_id: user.id,
      story_id: storyId,
      panel_id: currentPanel.id,
      dialog_id: dialogId || null,
      type: dialogId ? "dialog" : "narration",
      audio_url: publicUrl,
    });

    setShowRecorder(null);
    alert("Rekaman berhasil disimpan! 🎉");
  }

  function getBubbleClass(style: string) {
    switch (style) {
      case "oval": return "bubble-oval";
      case "kotak": return "bubble-kotak";
      case "awan": return "bubble-awan";
      case "ledakan": return "bubble-ledakan";
      default: return "bubble-kotak";
    }
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

  if (!story) return null;

  const isAuthor = user?.id === story.author_id;

  return (
    <div className={`min-h-screen flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "bg-surface"}`}>
      {!isFullscreen && <Navbar />}

      <main className="flex-1 flex flex-col">
        {/* Header bar */}
        <div className="bg-white border-b border-border px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isFullscreen && (
                <Link href="/stories">
                  <Button variant="ghost" size="icon">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </Link>
              )}
              <div>
                <h1 className="font-bold text-base sm:text-lg line-clamp-1">
                  {story.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>oleh {story.author_name || "Guru"}</span>
                  <Badge variant="secondary" className="text-[10px]">{story.level}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAuthor && (
                <Link href={`/stories/${story.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Panel Viewer */}
        {panels.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Belum Ada Panel</h3>
              <p className="text-muted text-sm">
                Cerita ini belum memiliki panel.
                {isAuthor && " Klik Edit untuk menambahkan panel."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Panel content */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-4xl panel-enter" key={currentPanel?.id}>
                <div
                  className="relative w-full rounded-2xl border-2 border-border overflow-hidden shadow-lg"
                  style={{
                    backgroundColor: currentPanel?.background_color || "#f0f9ff",
                    minHeight: "400px",
                  }}
                >
                  {/* Panel image */}
                  {currentPanel?.image_url ? (
                    <img
                      src={currentPanel.image_url}
                      alt={`Panel ${currentIndex + 1}`}
                      className="w-full h-auto max-h-[500px] object-contain"
                    />
                  ) : (
                    <div className="w-full h-[300px] flex items-center justify-center">
                      <ImageIcon className="w-20 h-20 text-black/10" />
                    </div>
                  )}

                  {/* Dialog bubbles overlay */}
                  {currentPanel?.dialogs?.map((dialog) => (
                    <div
                      key={dialog.id}
                      className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-4 py-3 max-w-[200px]`}
                      style={{
                        left: `${dialog.position_x}%`,
                        top: `${dialog.position_y}%`,
                        borderColor: dialog.character_color,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: dialog.character_color }}>
                        {dialog.character_name}
                      </p>
                      <p className="text-sm leading-relaxed">{dialog.text}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {dialog.audio_url && (
                          <AudioPlayer src={dialog.audio_url} compact label="🔊" />
                        )}
                        {user && user.role === "siswa" && (
                          <button
                            onClick={() =>
                              setShowRecorder(
                                showRecorder === dialog.id ? null : dialog.id
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                          >
                            <Mic className="w-3 h-3" />
                            Rekam
                          </button>
                        )}
                      </div>
                      {showRecorder === dialog.id && (
                        <div className="mt-2">
                          <AudioRecorder
                            onSave={(blob) => handleSaveRecording(blob, dialog.id)}
                            onCancel={() => setShowRecorder(null)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Narration area */}
                {currentPanel?.narration_text && (
                  <div className="mt-4 bg-white rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {currentPanel.narration_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {currentPanel.narration_audio_url && (
                          <AudioPlayer
                            src={currentPanel.narration_audio_url}
                            compact
                            label="Dengar"
                          />
                        )}
                        {user && user.role === "siswa" && (
                          <button
                            onClick={() =>
                              setShowRecorder(
                                showRecorder === "narration" ? null : "narration"
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                          >
                            <Mic className="w-3 h-3" />
                            Rekam
                          </button>
                        )}
                      </div>
                    </div>
                    {showRecorder === "narration" && (
                      <div className="mt-3">
                        <AudioRecorder
                          onSave={(blob) => handleSaveRecording(blob)}
                          onCancel={() => setShowRecorder(null)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Background audio */}
                {currentPanel?.background_audio_url && (
                  <div className="mt-3">
                    <AudioPlayer
                      src={currentPanel.background_audio_url}
                      label="Suara Latar"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Navigation bar */}
            <div className="bg-white border-t border-border px-4 sm:px-6 py-3">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Sebelumnya
                </Button>

                {/* Panel indicators */}
                <div className="flex items-center gap-1.5">
                  {panels.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === currentIndex
                          ? "bg-primary w-6"
                          : "bg-border hover:bg-muted"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted ml-2">
                    {currentIndex + 1} / {panels.length}
                  </span>
                </div>

                <Button
                  variant={currentIndex === panels.length - 1 ? "accent" : "primary"}
                  size="sm"
                  onClick={goNext}
                  disabled={currentIndex === panels.length - 1}
                >
                  {currentIndex === panels.length - 1 ? "Selesai" : "Selanjutnya"}
                  {currentIndex < panels.length - 1 && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
