"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AudioPlayer } from "@/components/audio/audio-player";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mic,
  Image as ImageIcon,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Dialog {
  id: string;
  character_name: string;
  character_color: string;
  text: string;
  audio_url?: string;
  bubble_style: string;
  position_x: number;
  position_y: number;
}

interface Panel {
  id: string;
  order_index: number;
  image_url?: string;
  background_color: string;
  narration_text?: string;
  narration_audio_url?: string;
  background_audio_url?: string;
  dialogs: Dialog[];
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  assigned_character?: string;
  assigned_color?: string;
  is_narrator: boolean;
}

interface SessionResult {
  id: string;
  token: string;
  story: {
    id: string;
    title: string;
    description: string;
    cover_image_url?: string;
    panels: Panel[];
  };
  participants: Participant[];
  recordings_by_dialog: Record<string, string>;
  ended_at: string;
}

export default function PlayPage() {
  const params = useParams();
  const token = params.token as string;

  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelIndex, setPanelIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/play/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setResult(data);
      })
      .catch(() => setError("Gagal memuat hasil rekaman."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <Lock className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Rekaman Tidak Ditemukan</h2>
          <p className="text-white/40 text-sm mb-6">{error || "Link tidak valid atau sudah kadaluarsa."}</p>
          <Link href="/">
            <Button variant="primary">Ke Beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const panels = result.story.panels ?? [];
  const currentPanel = panels[panelIndex];

  function getAssignedParticipant(characterName: string) {
    return result!.participants.find((p) => p.assigned_character === characterName);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-950 border-b border-white/10 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0">
              <Image src="/logo-icon.svg" alt="PADU" width={28} height={28} className="w-7 h-7" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Mic className="w-3 h-3" /> Hasil Rekaman
                </span>
                <Lock className="w-3 h-3 text-white/20" title="Link private" />
              </div>
              <h1 className="font-bold text-sm text-white line-clamp-1">{result.story.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-white/30">
            <Users className="w-3.5 h-3.5" />
            {result.participants.length} pemeran
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">
        {/* Sidebar: cast */}
        <aside className="lg:w-60 bg-gray-900 border-b lg:border-b-0 lg:border-r border-white/10 p-4">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Pemeran</h2>
          <div className="space-y-2">
            {result.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: p.assigned_color || "#64748b" }}
                >
                  {(p.user_name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{p.user_name}</p>
                  {p.is_narrator ? (
                    <p className="text-[10px] text-primary">Narator</p>
                  ) : p.assigned_character ? (
                    <p className="text-[10px] truncate" style={{ color: p.assigned_color || "#94a3b8" }}>
                      {p.assigned_character}
                    </p>
                  ) : (
                    <p className="text-[10px] text-white/20">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main: panel viewer */}
        <main className="flex-1 flex flex-col">
          {currentPanel ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-3xl">
                  {/* Panel */}
                  <div
                    className="relative w-full rounded-2xl border border-white/10 overflow-hidden shadow-xl"
                    style={{ backgroundColor: currentPanel.background_color || "#f0f9ff", minHeight: 320 }}
                  >
                    {currentPanel.image_url ? (
                      <img
                        src={currentPanel.image_url}
                        alt={`Panel ${panelIndex + 1}`}
                        className="w-full aspect-[3/2] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/2] flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-black/10" />
                      </div>
                    )}

                    {/* Dialog bubbles */}
                    {currentPanel.dialogs?.map((dialog) => {
                      const participant = getAssignedParticipant(dialog.character_name);
                      const recordedAudio = result.recordings_by_dialog[dialog.id];
                      return (
                        <div
                          key={dialog.id}
                          className="absolute bg-white shadow-md border-2 px-3 py-2 max-w-[190px]"
                          style={{
                            left: `${dialog.position_x}%`,
                            top: `${dialog.position_y}%`,
                            transform: "translate(-50%, -50%)",
                            borderColor: dialog.character_color,
                            borderRadius: "12px",
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-[10px] font-bold" style={{ color: dialog.character_color }}>
                              {dialog.character_name}
                            </p>
                            {participant && (
                              <span className="text-[9px] text-gray-400">
                                ({participant.user_name?.split(" ")[0]})
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed">{dialog.text}</p>
                          {/* Recorded audio takes priority over original */}
                          {(recordedAudio || dialog.audio_url) && (
                            <div className="mt-1.5">
                              <AudioPlayer
                                src={recordedAudio || dialog.audio_url!}
                                compact
                                label={recordedAudio ? "🎙️" : "🔊"}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Narration */}
                  {currentPanel.narration_text && (
                    <div className="mt-4 bg-gray-800 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-white/40 block mb-1">Narasi</span>
                          <p className="text-sm text-white leading-relaxed">{currentPanel.narration_text}</p>
                        </div>
                        {currentPanel.narration_audio_url && (
                          <AudioPlayer src={currentPanel.narration_audio_url} compact label="Dengar" />
                        )}
                      </div>
                    </div>
                  )}

                  {currentPanel.background_audio_url && (
                    <div className="mt-3">
                      <AudioPlayer src={currentPanel.background_audio_url} label="Suara Latar" />
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-gray-950 border-t border-white/10 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPanelIndex((i) => Math.max(0, i - 1))}
                    disabled={panelIndex === 0}
                  >
                    <ArrowLeft className="w-4 h-4" /> Sebelumnya
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {panels.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPanelIndex(i)}
                        className={`rounded-full transition-all ${i === panelIndex ? "w-6 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40"}`}
                      />
                    ))}
                    <span className="text-xs text-white/30 ml-2">{panelIndex + 1} / {panels.length}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setPanelIndex((i) => Math.min(panels.length - 1, i + 1))}
                    disabled={panelIndex === panels.length - 1}
                  >
                    Selanjutnya <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/30">Cerita ini tidak memiliki panel.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
