"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { useSession } from "next-auth/react";
import type { UserProfile, Panel, Dialog } from "@/lib/types";
import { useLiveSession } from "@/lib/webrtc/use-live-session";
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
  UserCog,
  Users,
  Volume2,
  X,
  Image as ImageIcon,
  Phone,
  PhoneOff,
  PlayCircle,
  Square,
  ExternalLink,
} from "lucide-react";

export default function LiveSessionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data: sessionData } = useSession();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleCharacter, setRoleCharacter] = useState("");
  const [roleColor, setRoleColor] = useState("#3b82f6");
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [assigningCharacter, setAssigningCharacter] = useState<{ name: string; color: string } | null>(null);
  const [recordingDialogId, setRecordingDialogId] = useState<string | null>(null);
  const [recordingNarrationPanelId, setRecordingNarrationPanelId] = useState<string | null>(null);
  const [uploadingDialogId, setUploadingDialogId] = useState<string | null>(null);
  const [uploadingNarrationPanelId, setUploadingNarrationPanelId] = useState<string | null>(null);
  const [savedDialogIds, setSavedDialogIds] = useState<Set<string>>(new Set());
  const [savedNarrationPanelIds, setSavedNarrationPanelIds] = useState<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);

  // Load auth user
  useEffect(() => {
    if (!sessionData?.user) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profile) => { setUser(profile as UserProfile); setAuthLoading(false); })
      .catch(() => router.push("/login"));
  }, [sessionData, router]);

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

  // Load panels — use session story copy if available, else fall back to original
  const activeStoryId = (session as any)?.session_story_id || session?.story_id;

  const loadPanels = useCallback(async () => {
    if (!activeStoryId) return;
    const res = await fetch(`/api/panels?story_id=${activeStoryId}`);
    if (res.ok) {
      const data = await res.json();
      setPanels(
        data.map((p: Record<string, unknown>) => ({
          ...p,
          dialogs: ((p.dialogs as Dialog[]) || []).sort(
            (a: Dialog, b: Dialog) => a.order_index - b.order_index
          ),
        })) as Panel[]
      );
    }
  }, [activeStoryId]);

  useEffect(() => { loadPanels(); }, [loadPanels]);

  // Reload panels when any participant records a dialog
  useEffect(() => {
    const handler = () => loadPanels();
    window.addEventListener("live-dialog-updated", handler);
    return () => window.removeEventListener("live-dialog-updated", handler);
  }, [loadPanels]);

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

  async function startDialogRecording(dialogId: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        await uploadDialogRecording(dialogId, blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingDialogId(dialogId);
    } catch {
      alert("Izin mikrofon diperlukan untuk merekam.");
    }
  }

  function stopDialogRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecordingDialogId(null);
  }

  async function startNarrationRecording(panelId: string) {
    if (recordingDialogId || recordingNarrationPanelId) return; // one recording at a time
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        await uploadNarrationRecording(panelId, blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingNarrationPanelId(panelId);
    } catch {
      alert("Izin mikrofon diperlukan untuk merekam.");
    }
  }

  function stopNarrationRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecordingNarrationPanelId(null);
  }

  async function uploadNarrationRecording(panelId: string, blob: Blob) {
    if (!session || !user) return;
    setUploadingNarrationPanelId(panelId);
    try {
      const formData = new FormData();
      formData.append("file", blob, `narration-${panelId}-${Date.now()}.webm`);
      formData.append("bucket", "audio");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      await fetch(`/api/live-sessions/${sessionId}/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration_audio_url: url }),
      });

      setSavedNarrationPanelIds((prev) => new Set([...prev, panelId]));
      await loadPanels();
    } finally {
      setUploadingNarrationPanelId(null);
    }
  }

  async function uploadDialogRecording(dialogId: string, blob: Blob) {
    if (!session || !user) return;
    setUploadingDialogId(dialogId);
    try {
      const formData = new FormData();
      formData.append("file", blob, `dialog-${dialogId}-${Date.now()}.webm`);
      formData.append("bucket", "audio");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      // PATCH the dialog's audio_url in the session story copy
      await fetch(`/api/live-sessions/${sessionId}/dialogs/${dialogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: url }),
      });

      setSavedDialogIds((prev) => new Set([...prev, dialogId]));
      // Reload panels so the audio player shows the new recording immediately
      await loadPanels();
    } finally {
      setUploadingDialogId(null);
    }
  }

  async function handleEndSession() {
    await fetch(`/api/live-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    // endSession() broadcasts session_end → all clients call loadSession() → get recording_token
    endSession();
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Radio className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2 text-white">Sesi Tidak Ditemukan</h2>
            <p className="text-white/50 text-sm mb-4">{error}</p>
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
      <div className="min-h-screen flex flex-col bg-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Session ended
  if (session.status === "finished") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">Sesi Telah Berakhir</h2>
            <p className="text-white/50 text-sm mb-6">
              Sesi baca bersama untuk &ldquo;{session.story?.title}&rdquo; sudah selesai. Terima kasih sudah berpartisipasi!
            </p>
            {session?.recording_token && (
              <div className="mb-6 bg-gray-800 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-white/40 mb-2">🎙️ Hasil rekaman sesi tersimpan</p>
                <p className="text-xs text-white/30 mb-3">Link ini bersifat private. Bagikan hanya ke yang berwenang.</p>
                <Link href={`/play/${session.recording_token}`} target="_blank">
                  <Button variant="primary" className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Lihat & Putar Hasil Rekaman
                  </Button>
                </Link>
              </div>
            )}
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
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Top bar — dark */}
      <div className="bg-gray-950 border-b border-white/10 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: logo + back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/live" className="shrink-0">
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/" className="shrink-0">
              <Image src="/logo-icon.svg" alt="PADU" width={32} height={32} className="w-8 h-8" priority />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {session.status === "waiting" ? "Menunggu" : "Live"}
                </span>
                <h1 className="font-bold text-sm sm:text-base line-clamp-1 text-white">
                  {session.story?.title || "Sesi Baca Bersama"}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>Kode:</span>
                <code className="font-mono font-bold text-white/80">{session.code}</code>
                <button onClick={copyCode} className="text-white/40 hover:text-white/80">
                  {copiedCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <span>·</span>
                <span>{presenceList.length} online</span>
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 shrink-0">
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
                  title="Keluar dari sesi"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Host: start / end */}
            {isHost && session.status === "waiting" && (
              <Button variant="primary" size="sm" onClick={startSession} disabled={participants.length < 1}>
                <PlayCircle className="w-4 h-4" />
                Mulai Sesi
              </Button>
            )}
            {isHost && session.status === "active" && (
              <Button variant="danger" size="sm" onClick={handleEndSession}>
                Akhiri Sesi
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar: participants */}
        <aside className="lg:w-72 bg-gray-900 border-b lg:border-b-0 lg:border-r border-white/10 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white">
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
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-white/5 hover:bg-white/5"
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
                    <p className="text-xs font-semibold truncate text-white">
                      {p.user_name || "Pengguna"} {isMe && <span className="text-white/40">(Anda)</span>}
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
                      <span className="text-[10px] text-white/30">Belum ada peran</span>
                    )}
                  </div>

                  {/* Host: assign role */}
                  {isHost && (
                    <button
                      onClick={() => handleAssignRole(p.id)}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-white/10 hover:bg-primary/30 text-white/60 hover:text-white transition-colors shrink-0"
                      title="Atur peran"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Peran</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Characters legend */}
          {allCharacters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Karakter Cerita</h3>
              <div className="space-y-1.5">
                {allCharacters.map((c) => {
                  const assigned = getAssignedUser(c.name);
                  return (
                    <div
                      key={c.name}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ backgroundColor: `${c.color}18` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-xs font-semibold" style={{ color: c.color }}>{c.name}</span>
                      </div>
                      {assigned ? (
                        <span className="text-[10px] text-white/50 truncate max-w-[80px]">
                          {assigned.user_name?.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/20 italic">kosong</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Main: Panel viewer */}
        <main className="flex-1 flex flex-col bg-gray-900">
          {/* Waiting room */}
          {session.status === "waiting" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-5">

                {/* Session code */}
                <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-5 text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Kode Sesi — bagikan ke peserta</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-extrabold tracking-[0.3em] text-primary">
                      {session.code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                      {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-sm text-white/40 mt-2">{presenceList.length} peserta online</p>
                </div>

                {/* Character role assignment board (host only) */}
                {isHost && allCharacters.length > 0 && (
                  <div className="bg-gray-800/80 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <UserCog className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-white">Pembagian Peran</h3>
                      <span className="text-xs text-white/30 ml-auto">Klik karakter → pilih peserta</span>
                    </div>
                    <div className="space-y-2">
                      {/* Narrator row */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Volume2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-semibold text-white">Narator</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {participants.map((p) => {
                            const isNarrator = p.is_narrator;
                            return (
                              <button
                                key={p.id}
                                onClick={() => assignNarrator(p.id)}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                                  isNarrator
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white/5 text-white/50 border-white/10 hover:border-primary/50 hover:text-white"
                                }`}
                              >
                                {p.user_name?.split(" ")[0]} {p.user_id === user.id && "(Anda)"}
                              </button>
                            );
                          })}
                          {participants.length === 0 && <span className="text-xs text-white/20 italic">Belum ada peserta</span>}
                        </div>
                      </div>

                      {/* Character rows */}
                      {allCharacters.map((c) => {
                        const assigned = getAssignedUser(c.name);
                        return (
                          <div
                            key={c.name}
                            className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                            style={{
                              backgroundColor: `${c.color}12`,
                              borderColor: `${c.color}30`,
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              <span className="text-sm font-semibold" style={{ color: c.color }}>{c.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              {participants.map((p) => {
                                const isAssigned = assigned?.id === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => assignCharacter(p.id, c.name, c.color)}
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                                      isAssigned
                                        ? "text-white border-current"
                                        : "bg-white/5 text-white/50 border-white/10 hover:border-current hover:text-white"
                                    }`}
                                    style={isAssigned ? { backgroundColor: c.color, borderColor: c.color } : {}}
                                  >
                                    {p.user_name?.split(" ")[0]} {p.user_id === user.id && "(Anda)"}
                                  </button>
                                );
                              })}
                              {participants.length === 0 && <span className="text-xs text-white/20 italic">Belum ada peserta</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Start button (host) */}
                {isHost && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={startSession}
                    disabled={participants.length < 1}
                    className="w-full text-base"
                  >
                    <PlayCircle className="w-5 h-5" />
                    Mulai Sesi Baca Bersama
                  </Button>
                )}

                {!isHost && (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-white/40">Menunggu guru memulai sesi...</p>
                  </div>
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
                            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                              <Badge variant="primary" className="text-[8px] py-0">
                                Peran Anda
                              </Badge>
                              {uploadingDialogId === dialog.id ? (
                                <span className="text-[9px] text-muted flex items-center gap-0.5">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Menyimpan...
                                </span>
                              ) : savedDialogIds.has(dialog.id) ? (
                                <span className="text-[9px] text-green-500 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terekam
                                  <button
                                    onClick={() => setSavedDialogIds((prev) => { const s = new Set(prev); s.delete(dialog.id); return s; })}
                                    className="ml-1 underline opacity-60 hover:opacity-100"
                                  >
                                    Ulang
                                  </button>
                                </span>
                              ) : recordingDialogId === dialog.id ? (
                                <button
                                  onClick={stopDialogRecording}
                                  className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 animate-pulse"
                                >
                                  <Square className="w-2.5 h-2.5 fill-red-500" /> Stop
                                </button>
                              ) : (
                                <button
                                  onClick={() => startDialogRecording(dialog.id)}
                                  disabled={!!recordingDialogId}
                                  className="flex items-center gap-0.5 text-[9px] font-bold text-primary hover:text-primary/80 disabled:opacity-30"
                                  title="Rekam bacaan Anda"
                                >
                                  <Mic className="w-2.5 h-2.5" /> Rekam
                                </button>
                              )}
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-muted">Narasi</span>
                            {(() => {
                              const narrator = participants.find((p) => p.is_narrator);
                              const isMyNarration = narrator?.user_id === user.id || isHost;
                              if (narrator) {
                                return (
                                  <>
                                    <Badge variant="primary" className="text-[8px] py-0">
                                      {narrator.user_name?.split(" ")[0]}
                                      {narrator.user_id === user.id && " (Anda)"}
                                    </Badge>
                                    {isMyNarration && session.status === "active" && (
                                      uploadingNarrationPanelId === currentPanel.id ? (
                                        <span className="text-[9px] text-muted flex items-center gap-0.5">
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Menyimpan...
                                        </span>
                                      ) : savedNarrationPanelIds.has(currentPanel.id) ? (
                                        <span className="text-[9px] text-green-600 flex items-center gap-0.5">
                                          <Check className="w-2.5 h-2.5" /> Terekam
                                          <button
                                            onClick={() => setSavedNarrationPanelIds((prev) => { const s = new Set(prev); s.delete(currentPanel.id); return s; })}
                                            className="ml-1 underline opacity-60 hover:opacity-100"
                                          >
                                            Ulang
                                          </button>
                                        </span>
                                      ) : recordingNarrationPanelId === currentPanel.id ? (
                                        <button
                                          onClick={stopNarrationRecording}
                                          className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 animate-pulse"
                                        >
                                          <Square className="w-2.5 h-2.5 fill-red-500" /> Stop
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => startNarrationRecording(currentPanel.id)}
                                          disabled={!!recordingDialogId || !!recordingNarrationPanelId}
                                          className="flex items-center gap-0.5 text-[9px] font-bold text-primary hover:text-primary/80 disabled:opacity-30"
                                          title="Rekam narasi"
                                        >
                                          <Mic className="w-2.5 h-2.5" /> Rekam Narasi
                                        </button>
                                      )
                                    )}
                                  </>
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
                            label="🎙️"
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
          <div className="bg-gray-950 border-t border-white/10 px-4 py-3">
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
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-white">Atur Peran Peserta</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Character selection */}
              <div>
                {editingParticipantId && (
                <p className="text-xs text-white/40 mb-4">
                  Peserta: <span className="text-white font-semibold">{participants.find(p => p.id === editingParticipantId)?.user_name}</span>
                </p>
              )}
              <label className="block text-sm font-semibold mb-2 text-white">
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
                          ? "border-current"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      style={roleCharacter === c.name ? { borderColor: c.color, backgroundColor: `${c.color}20` } : {}}
                    >
                      <div className="flex items-center gap-2 text-white">
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
                        ? "border-white/30 bg-white/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-white/50">
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
                  className="w-full px-3 py-2 rounded-lg border-2 border-white/10 hover:border-primary/30 text-sm font-medium transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-white">
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
