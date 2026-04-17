"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Story, Panel, Dialog, UserProfile, DisplayMode } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SlideViewer,
  FadeViewer,
  ContinuousViewer,
  VerticalScrollViewer,
  FlipBookViewer,
} from "@/components/story-viewer";
import {
  ChevronLeft,
  Edit,
  Film,
  Loader2,
  Maximize,
  Minimize,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [story, setStory] = useState<Story | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const supabase = createClient();

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

  // Handle saving student recordings
  const handleSaveRecording = useCallback(async (panelId: string, blob: Blob, dialogId?: string) => {
    if (!user) return;

    const fileName = `${user.id}/${storyId}/${panelId}/${Date.now()}.webm`;
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
      panel_id: panelId,
      dialog_id: dialogId || null,
      type: dialogId ? "dialog" : "narration",
      audio_url: publicUrl,
    });

    alert("Rekaman berhasil disimpan! 🎉");
  }, [user, storyId, supabase]);

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
  const displayMode: DisplayMode = (story.display_mode as DisplayMode) || "slide";

  function renderViewer() {
    if (panels.length === 0) {
      return (
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
      );
    }

    const recHandler = user ? handleSaveRecording : undefined;

    switch (displayMode) {
      case "fade":
        return <FadeViewer panels={panels} user={user} onSaveRecording={recHandler} />;
      case "continuous":
        return <ContinuousViewer panels={panels} user={user} onSaveRecording={recHandler} />;
      case "vertical-scroll":
        return <VerticalScrollViewer panels={panels} user={user} onSaveRecording={recHandler} />;
      case "flipbook":
        return <FlipBookViewer panels={panels} user={user} onSaveRecording={recHandler} />;
      case "slide":
      default:
        return <SlideViewer panels={panels} user={user} onSaveRecording={recHandler} />;
    }
  }

  return (
    <div className={`min-h-screen flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "bg-background"}`}>
      {!isFullscreen && <Navbar />}

      {/* Video Trailer Modal */}
      {showTrailer && story.video_trailer_url && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={story.video_trailer_url}
              controls
              autoPlay
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {/* Header bar */}
        <div className="bg-surface-card border-b border-border px-4 sm:px-6 py-3">
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
                  <Badge variant="outline" className="text-[9px] capitalize">{displayMode.replace("-", " ")}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {story.video_trailer_url && (
                <Button variant="outline" size="sm" onClick={() => setShowTrailer(true)}>
                  <Film className="w-4 h-4" />
                  <span className="hidden sm:inline">Trailer</span>
                </Button>
              )}
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

        {/* Viewer (rendered based on display_mode) */}
        {renderViewer()}
      </main>
    </div>
  );
}
