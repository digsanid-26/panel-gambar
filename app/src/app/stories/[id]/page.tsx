"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Story, Panel, Dialog, UserProfile, DisplayMode, StoryCharacter } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SlideViewer,
  FadeViewer,
  ContinuousViewer,
  VerticalScrollViewer,
  FlipBookViewer,
  StoryCoverPage,
} from "@/components/story-viewer";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit,
  ExternalLink,
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
  const [managedStudentId, setManagedStudentId] = useState<string | undefined>(undefined);
  const [duplicating, setDuplicating] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const { data: session } = useSession();

  useEffect(() => {
    async function load() {
      if (session?.user) {
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser(profile as UserProfile);
          if (profile.role === "siswa") {
            const msRes = await fetch("/api/students/managed");
            if (msRes.ok) {
              const msData = await msRes.json();
              if (msData?.[0]?.id) setManagedStudentId(msData[0].id);
            }
          }
        }
      }

      const storyRes = await fetch(`/api/stories/${storyId}`);
      if (!storyRes.ok) { router.push("/stories"); return; }
      const storyData = await storyRes.json();
      setStory({ ...storyData, author_name: storyData.author?.name } as Story);

      const panelsRes = await fetch(`/api/panels?story_id=${storyId}`);
      if (panelsRes.ok) {
        const panelsData = await panelsRes.json();
        setPanels(
          panelsData.map((p: Record<string, unknown>) => ({
            ...p,
            dialogs: ((p.dialogs as Dialog[]) || []).sort(
              (a: Dialog, b: Dialog) => a.order_index - b.order_index
            ),
          })) as Panel[]
        );
      }

      setLoading(false);
    }
    load();
  }, [storyId, session]);

  // Handle saving student recordings
  const handleSaveRecording = useCallback(async (panelId: string, blob: Blob, dialogId?: string) => {
    if (!user) return;

    const fd = new FormData();
    fd.append("file", new File([blob], `${Date.now()}.webm`));
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    if (!uploadRes.ok) { alert("Gagal menyimpan rekaman."); return; }
    const { url: publicUrl } = await uploadRes.json();

    await fetch("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        panel_id: panelId,
        dialog_id: dialogId || null,
        type: dialogId ? "dialog" : "narration",
        audio_url: publicUrl,
      }),
    });

    alert("Rekaman berhasil disimpan! 🎉");
  }, [user, storyId]);

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
  const isGuru = user?.role === "guru" || user?.role === "admin";
  const displayMode: DisplayMode = (story.display_mode as DisplayMode) || "slide";

  async function handleDuplicate() {
    if (!story) return;
    if (!confirm("Duplikasi cerita ini ke akun Anda? Salinan akan menjadi draft yang bisa Anda edit dan personalisasi.")) return;
    setDuplicating(true);
    try {
      const res = await fetch("/api/stories/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: story.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Gagal menduplikasi cerita");
        return;
      }
      router.push(`/stories/${result.new_story_id}/edit`);
    } catch {
      alert("Gagal menduplikasi cerita");
    } finally {
      setDuplicating(false);
    }
  }

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
    const chars = (story?.characters || []) as StoryCharacter[];

    switch (displayMode) {
      case "fade":
        return <FadeViewer panels={panels} user={user} onSaveRecording={recHandler} storyCharacters={chars} managedStudentId={managedStudentId} onFinish={() => setShowSummaryModal(true)} />;
      case "continuous":
        return <ContinuousViewer panels={panels} user={user} onSaveRecording={recHandler} storyCharacters={chars} managedStudentId={managedStudentId} />;
      case "vertical-scroll":
        return <VerticalScrollViewer panels={panels} user={user} onSaveRecording={recHandler} storyCharacters={chars} managedStudentId={managedStudentId} />;
      case "flipbook":
        return <FlipBookViewer panels={panels} user={user} onSaveRecording={recHandler} storyCharacters={chars} managedStudentId={managedStudentId} />;
      case "slide":
      default:
        return <SlideViewer panels={panels} user={user} onSaveRecording={recHandler} storyCharacters={chars} managedStudentId={managedStudentId} onFinish={() => setShowSummaryModal(true)} />;
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
              {isGuru && !isAuthor && (
                <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">Duplikasi</span>
                </Button>
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

        {/* Cover page or viewer */}
        {showCover ? (
          <StoryCoverPage
            story={story}
            onPlay={() => setShowCover(false)}
            onShowTrailer={story.video_trailer_url ? () => setShowTrailer(true) : undefined}
          />
        ) : (
          renderViewer()
        )}
      </main>
      {/* ── Story Summary Modal ──────────────────────────────── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-bold text-base">Rangkuman Cerita</h2>
                  <p className="text-xs text-muted">{story.title}</p>
                </div>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="p-1.5 rounded-lg hover:bg-surface-alt text-muted hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Cover + description */}
              {(story.cover_image_url || story.description) && (
                <div className="flex gap-4">
                  {story.cover_image_url && (
                    <img src={story.cover_image_url} alt="Cover" className="w-24 h-24 rounded-xl object-cover shrink-0 shadow" />
                  )}
                  {story.description && (
                    <p className="text-sm text-muted leading-relaxed">{story.description}</p>
                  )}
                </div>
              )}

              {/* Tujuan Pembelajaran */}
              {story.tujuan_pembelajaran && story.tujuan_pembelajaran.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Tujuan Pembelajaran</h3>
                  <ul className="space-y-1">
                    {story.tujuan_pembelajaran.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Refleksi Siswa */}
              {story.refleksi_siswa && story.refleksi_siswa.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Refleksi Siswa</h3>
                  <ul className="space-y-1">
                    {story.refleksi_siswa.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Kata Kunci */}
              {story.kata_kunci && story.kata_kunci.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Kata Kunci</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {story.kata_kunci.map((k, i) => (
                      <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Glosarium */}
              {story.glosarium && story.glosarium.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Glosarium</h3>
                  <div className="space-y-1">
                    {story.glosarium.map((g, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-semibold">{g.istilah}</span>
                        <span className="text-muted"> — {g.definisi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link Quiz */}
              {story.link_quiz && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Kuis / Latihan</h3>
                  <a href={story.link_quiz} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Kuis
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
              <button
                onClick={() => { setShowSummaryModal(false); setShowCover(true); }}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-semibold"
              >
                Baca Ulang
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-surface-alt transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
