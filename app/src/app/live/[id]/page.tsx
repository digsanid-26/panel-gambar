"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, Panel, Dialog } from "@/lib/types";
import { useLiveSession } from "@/lib/webrtc/use-live-session";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio/audio-player";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Copy,
  Check,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Settings,
  Users,
  Volume2,
  X,
  Image as ImageIcon,
  Phone,
  PhoneOff,
} from "lucide-react";

export default function LiveSessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleCharacter, setRoleCharacter] = useState("");
  const [roleColor, setRoleColor] = useState("#3b82f6");
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);

  // Load auth user
  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (profile) setUser(profile as UserProfile);
      setAuthLoading(false);
    }
    loadUser();
  }, []);

  // Use the live session hook (only after user is loaded)
  const liveSession = useLiveSession(
    sessionId,
    user || { id: "", email: "", name: "", role: "siswa", created_at: "" }
  );

  const {
    session,
    participants,
    presenceList,
    peers,
    currentPanelIndex,
    isMuted,
    isHost,
    isConnected,
    voiceReady,
    error,
    startVoice,
    toggleMute,
    navigatePanel,
    assignCharacter,
    assignNarrator,
    startSession,
    endSession,
    leaveSession,
  } = liveSession;

  // Load panels for the story
  useEffect(() => {
    if (!session?.story_id) return;
    async function loadPanels() {
      const { data } = await supabase
        .from("panels")
        .select("*, dialogs(*)")
        .eq("story_id", session!.story_id)
        .order("order_index", { ascending: true });
      if (data) {
        setPanels(
          data.map((p: Record<string, unknown>) => ({
            ...p,
            dialogs: ((p.dialogs as Dialog[]) || []).sort(
              (a: Dialog, b: Dialog) => a.order_index - b.order_index
            ),
          })) as Panel[]
        );
      }
    }
    loadPanels();
  }, [session?.story_id]);

  const currentPanel = panels[currentPanelIndex];

  // Get unique character names from all panels
  const allCharacters = useMemo(() => {
    const charMap = new Map<string, string>();
    panels.forEach((p) => {
      p.dialogs?.forEach((d) => {
        if (!charMap.has(d.character_name)) {
          charMap.set(d.character_name, d.character_color);
        }
      });
    });
    return Array.from(charMap.entries()).map(([name, color]) => ({ name, color }));
  }, [panels]);

  // Check which participant is assigned to a dialog's character
  function getAssignedUser(characterName: string) {
    return participants.find((p) => p.assigned_character === characterName);
  }

  function isOnline(userId: string) {
    return presenceList.some((p) => p.user_id === userId);
  }

  function copyCode() {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
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

  function handleAssignRole(participantId: string) {
    const p = participants.find((x) => x.id === participantId);
    setEditingParticipantId(participantId);
    setRoleCharacter(p?.assigned_character || "");
    setRoleColor(p?.assigned_color || "#3b82f6");
    setShowRoleModal(true);
  }

  async function saveRole() {
    if (editingParticipantId && roleCharacter) {
      await assignCharacter(editingParticipantId, roleCharacter, roleColor);
    }
    setShowRoleModal(false);
    setEditingParticipantId(null);
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Radio className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Sesi Tidak Ditemukan</h2>
            <p className="text-muted text-sm mb-4">{error}</p>
            <Link href="/live">
              <Button variant="primary">Kembali</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Session ended
  if (session.status === "finished") {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sesi Telah Berakhir</h2>
            <p className="text-muted text-sm mb-6">
              Sesi baca bersama untuk &ldquo;{session.story?.title}&rdquo; sudah selesai. Terima kasih sudah berpartisipasi!
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/live">
                <Button variant="outline">Kembali</Button>
              </Link>
              <Link href={`/stories/${session.story_id}`}>
                <Button variant="primary">Lihat Cerita</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/live">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <h1 className="font-bold text-sm sm:text-base line-clamp-1">
                  {session.story?.title || "Sesi Baca Bersama"}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Kode:</span>
                <code className="font-mono font-bold text-foreground">{session.code}</code>
                <button onClick={copyCode} className="text-secondary hover:text-secondary-dark">
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
                <span>·</span>
                <span>{presenceList.length} online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice controls */}
            {!voiceReady ? (
              <Button
                variant="accent"
                size="sm"
                onClick={startVoice}
                className="gap-1"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Nyalakan Suara</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant={isMuted ? "danger" : "outline"}
                  size="icon"
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { leaveSession(); router.push("/live"); }}
                  title="Putuskan suara"
                  className="text-danger"
                >
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Host controls */}
            {isHost && session.status === "waiting" && (
              <Button variant="primary" size="sm" onClick={startSession}>
                <Radio className="w-4 h-4" />
                Mulai Sesi
              </Button>
            )}
            {isHost && session.status === "active" && (
              <Button variant="danger" size="sm" onClick={endSession}>
                Akhiri Sesi
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar: participants */}
        <aside className="lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-border p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Peserta ({participants.length})
            </h2>
          </div>

          <div className="space-y-2">
            {participants.map((p) => {
              const online = isOnline(p.user_id);
              const peerState = peers.find((pr) => pr.userId === p.user_id);
              const speaking = peerState?.speaking || false;
              const isMe = p.user_id === user.id;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    speaking
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-transparent hover:bg-surface-alt"
                  }`}
                >
                  {/* Avatar / status */}
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor: p.assigned_color || "#94a3b8",
                      }}
                    >
                      {(p.user_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        online ? "bg-accent" : "bg-border"
                      }`}
                    />
                    {speaking && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent animate-ping" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {p.user_name || "Pengguna"} {isMe && "(Anda)"}
                    </p>
                    {p.assigned_character ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.assigned_color }}
                        />
                        <span className="text-[10px] font-medium" style={{ color: p.assigned_color }}>
                          {p.assigned_character}
                        </span>
                        {p.is_narrator && (
                          <Badge variant="primary" className="text-[8px] py-0 px-1 ml-1">
                            Narator
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted">Belum ada peran</span>
                    )}
                  </div>

                  {/* Host: assign role */}
                  {isHost && (
                    <button
                      onClick={() => handleAssignRole(p.id)}
                      className="text-muted hover:text-secondary p-1 shrink-0"
                      title="Atur peran"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Characters in story */}
          {allCharacters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-bold text-muted mb-2">Karakter dalam cerita:</h3>
              <div className="flex flex-wrap gap-1.5">
                {allCharacters.map((c) => {
                  const assigned = getAssignedUser(c.name);
                  return (
                    <div
                      key={c.name}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border"
                      style={{
                        borderColor: c.color,
                        color: c.color,
                        backgroundColor: `${c.color}10`,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                      {assigned && (
                        <span className="text-muted ml-0.5">
                          → {assigned.user_name?.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Main: Panel viewer */}
        <main className="flex-1 flex flex-col">
          {/* Waiting room */}
          {session.status === "waiting" && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Menunggu Peserta</h2>
                <p className="text-muted text-sm mb-6">
                  Bagikan kode sesi kepada siswa untuk bergabung.
                </p>

                <div className="bg-white rounded-2xl border-2 border-dashed border-primary/30 p-6 mb-6">
                  <p className="text-xs text-muted mb-2">Kode Sesi:</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-extrabold tracking-[0.3em] text-primary">
                      {session.code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="p-2 rounded-lg hover:bg-surface-alt text-muted hover:text-secondary"
                    >
                      {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted mb-4">
                  {presenceList.length} peserta bergabung
                </p>

                {isHost && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">
                      Atur peran peserta di panel kiri, lalu mulai sesi.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={startSession}
                      disabled={participants.length < 1}
                      className="w-full"
                    >
                      <Radio className="w-5 h-5" />
                      Mulai Sesi Baca Bersama
                    </Button>
                  </div>
                )}

                {!isHost && (
                  <p className="text-sm text-muted">
                    Menunggu guru memulai sesi...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Active session: panel viewer */}
          {session.status === "active" && panels.length > 0 && currentPanel && (
            <>
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-4xl panel-enter" key={currentPanel.id}>
                  <div
                    className="relative w-full rounded-2xl border-2 border-border overflow-hidden shadow-lg"
                    style={{
                      backgroundColor: currentPanel.background_color || "#f0f9ff",
                      minHeight: "350px",
                    }}
                  >
                    {/* Panel image */}
                    {currentPanel.image_url ? (
                      <img
                        src={currentPanel.image_url}
                        alt={`Panel ${currentPanelIndex + 1}`}
                        className="w-full aspect-[3/2] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[3/2] flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-black/10" />
                      </div>
                    )}

                    {/* Dialog bubbles */}
                    {currentPanel.dialogs?.map((dialog) => {
                      const assigned = getAssignedUser(dialog.character_name);
                      const isMyDialog =
                        assigned?.user_id === user.id;
                      const peerSpeaking =
                        assigned && peers.find((pr) => pr.userId === assigned.user_id)?.speaking;

                      return (
                        <div
                          key={dialog.id}
                          className={`absolute ${getBubbleClass(dialog.bubble_style)} bg-white shadow-md border-2 px-4 py-3 max-w-[200px] transition-all ${
                            isMyDialog
                              ? "ring-2 ring-primary ring-offset-2"
                              : ""
                          } ${
                            peerSpeaking
                              ? "ring-2 ring-accent ring-offset-1 scale-105"
                              : ""
                          }`}
                          style={{
                            left: `${dialog.position_x}%`,
                            top: `${dialog.position_y}%`,
                            borderColor: dialog.character_color,
                            transform: `translate(-50%, -50%)${peerSpeaking ? " scale(1.05)" : ""}`,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <p
                              className="text-xs font-bold"
                              style={{ color: dialog.character_color }}
                            >
                              {dialog.character_name}
                            </p>
                            {assigned && (
                              <span className="text-[9px] text-muted">
                                ({assigned.user_name?.split(" ")[0]})
                              </span>
                            )}
                            {peerSpeaking && (
                              <Volume2
                                className="w-3 h-3 text-accent animate-pulse"
                              />
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">
                            {dialog.text}
                          </p>
                          {isMyDialog && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <Badge variant="primary" className="text-[8px] py-0">
                                Peran Anda
                              </Badge>
                            </div>
                          )}
                          {dialog.audio_url && (
                            <div className="mt-1">
                              <AudioPlayer src={dialog.audio_url} compact label="🔊" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Narration */}
                  {currentPanel.narration_text && (
                    <div className="mt-4 bg-white rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-muted">Narasi</span>
                            {(() => {
                              const narrator = participants.find((p) => p.is_narrator);
                              if (narrator) {
                                return (
                                  <Badge variant="primary" className="text-[8px] py-0">
                                    {narrator.user_name?.split(" ")[0]}
                                    {narrator.user_id === user.id && " (Anda)"}
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-sm leading-relaxed">
                            {currentPanel.narration_text}
                          </p>
                        </div>
                        {currentPanel.narration_audio_url && (
                          <AudioPlayer
                            src={currentPanel.narration_audio_url}
                            compact
                            label="Dengar"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Background audio */}
                  {currentPanel.background_audio_url && (
                    <div className="mt-3">
                      <AudioPlayer
                        src={currentPanel.background_audio_url}
                        label="Suara Latar"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation (host only, others follow) */}
              <div className="bg-white border-t border-border px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  {isHost ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigatePanel(currentPanelIndex - 1)}
                        disabled={currentPanelIndex === 0}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Sebelumnya
                      </Button>
                      <div className="flex items-center gap-1.5">
                        {panels.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => navigatePanel(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              i === currentPanelIndex
                                ? "bg-primary w-6"
                                : "bg-border hover:bg-muted"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted ml-2">
                          {currentPanelIndex + 1} / {panels.length}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigatePanel(currentPanelIndex + 1)}
                        disabled={currentPanelIndex === panels.length - 1}
                      >
                        Selanjutnya
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="w-full text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {panels.map((_, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              i === currentPanelIndex
                                ? "bg-primary w-6"
                                : "bg-border"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-muted ml-2">
                          {currentPanelIndex + 1} / {panels.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Guru mengontrol navigasi panel
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {session.status === "active" && panels.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-muted">Cerita ini belum memiliki panel.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Role assignment modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Atur Peran</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Character selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Pilih Karakter
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allCharacters.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setRoleCharacter(c.name);
                        setRoleColor(c.color);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                        roleCharacter === c.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setRoleCharacter("");
                      setRoleColor("#94a3b8");
                    }}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      roleCharacter === ""
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-muted">
                      <X className="w-3 h-3" />
                      Hapus Peran
                    </div>
                  </button>
                </div>
              </div>

              {/* Narrator toggle */}
              <div>
                <button
                  onClick={() => {
                    if (editingParticipantId) {
                      assignNarrator(editingParticipantId);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border-2 border-border hover:border-primary/30 text-sm font-medium transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Jadikan Narator
                  </div>
                </button>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={saveRole}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
