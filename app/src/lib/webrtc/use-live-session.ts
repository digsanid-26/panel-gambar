// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PollingChannel } from "./polling-channel";
import { VoiceEngine, type PeerState } from "./voice-engine";
import type {
  LiveSession,
  SessionParticipant,
  UserProfile,
  BroadcastEvent,
} from "@/lib/types";

export interface PresenceState {
  user_id: string;
  user_name: string;
  user_role: string;
  online_at: string;
}

export interface UseLiveSessionReturn {
  session: LiveSession | null;
  participants: SessionParticipant[];
  presenceList: PresenceState[];
  peers: PeerState[];
  currentPanelIndex: number;
  isMuted: boolean;
  isHost: boolean;
  isConnected: boolean;
  voiceReady: boolean;
  error: string | null;
  // Actions
  startVoice: () => Promise<void>;
  toggleMute: () => void;
  navigatePanel: (index: number) => void;
  highlightDialog: (dialogId: string) => void;
  assignCharacter: (participantId: string, character: string, color: string) => Promise<void>;
  assignNarrator: (participantId: string) => Promise<void>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  leaveSession: () => void;
}

export function useLiveSession(
  sessionId: string,
  user: UserProfile
): UseLiveSessionReturn {
  const channelRef = useRef<PollingChannel | null>(null);
  const voiceRef = useRef<VoiceEngine | null>(null);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceState[]>([]);
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedDialog, setHighlightedDialog] = useState<string | null>(null);

  const isHost = !!(user.id && session && (session?.host_id === user.id || (session as any)?.hostId === user.id));

  // Derive presence from participants list (everyone who joined is considered online)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPresenceList(
      participants.map((p) => ({
        user_id: p.user_id,
        user_name: p.user_name || "",
        user_role: p.user_role || "",
        online_at: new Date().toISOString(),
      }))
    );
  }, [participants]);

  // Load session data
  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/live-sessions/${sessionId}`);
    if (!res.ok) { setError("Sesi tidak ditemukan."); return; }
    const data = await res.json();
    setSession(data as LiveSession);
    setCurrentPanelIndex(data.currentPanelIndex ?? data.current_panel_index ?? 0);
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Load participants
  const loadParticipants = useCallback(async () => {
    const res = await fetch(`/api/live-sessions/${sessionId}/participants`);
    if (res.ok) setParticipants(await res.json());
  }, [sessionId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Join as participant (only when user.id is available)
  useEffect(() => {
    if (!session || !user.id) return;
    fetch(`/api/live-sessions/${sessionId}/participants`, { method: "POST" })
      .then(() => loadParticipants())
      .catch(() => {});
  }, [session?.id, user.id]);

  // Setup polling channel for presence + broadcast
  useEffect(() => {
    if (!session) return;

    const channel = new PollingChannel(sessionId);

    // Broadcast: session events (panel_change, highlight_dialog, session_start, session_end)
    channel.on("broadcast", { event: "session-event" }, (msg: any) => {
      const evt = (msg?.payload || msg) as BroadcastEvent;
      switch (evt.type) {
        case "panel_change":
          setCurrentPanelIndex(evt.panel_index);
          break;
        case "highlight_dialog":
          setHighlightedDialog(evt.dialog_id);
          break;
        case "session_start":
          setSession((s) => (s ? { ...s, status: "active" } : s));
          break;
        case "session_end":
          // Re-fetch session so recording_token is available for all participants
          loadSession();
          break;
        case "dialog_updated":
          window.dispatchEvent(new CustomEvent("live-dialog-updated"));
          break;
      }
    });

    // Broadcast: participant joined/updated
    channel.on("broadcast", { event: "session-event" }, (msg: any) => {
      const evt = (msg?.payload || msg) as BroadcastEvent;
      if (evt.type === "participant_update") loadParticipants();
    });

    // Poll participants periodically
    const pollInterval = setInterval(() => loadParticipants(), 3000);

    channel.subscribe(() => setIsConnected(true));
    channelRef.current = channel;

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [session?.id, user.id]);

  // Start voice (WebRTC)
  const startVoice = useCallback(async () => {
    if (!channelRef.current) return;
    if (voiceRef.current) return;

    const engine = new VoiceEngine(
      channelRef.current,
      user.id,
      user.name,
      {
        onPeerJoined: () => setPeers(voiceRef.current?.getPeerList() || []),
        onPeerLeft: () => setPeers(voiceRef.current?.getPeerList() || []),
        onPeerSpeaking: () => setPeers([...(voiceRef.current?.getPeerList() || [])]),
        onError: (err) => setError(err),
      }
    );

    try {
      await engine.start();
      voiceRef.current = engine;
      setVoiceReady(true);

      // Connect to all existing peers in the presence list
      presenceList.forEach((p) => {
        if (p.user_id !== user.id) {
          engine.connectToPeer(p.user_id, p.user_name);
        }
      });
    } catch {
      setError("Gagal memulai voice. Pastikan izin mikrofon diberikan.");
    }
  }, [user, presenceList]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (voiceRef.current) {
      const muted = voiceRef.current.toggleMute();
      setIsMuted(muted);
    }
  }, []);

  // Navigate panel (host only)
  const navigatePanel = useCallback(
    (index: number) => {
      if (!isHost) return;
      setCurrentPanelIndex(index);
      channelRef.current?.send({ type: "broadcast", event: "session-event", payload: { type: "panel_change", panel_index: index } });
      fetch(`/api/live-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_panel_index: index }),
      }).catch(() => {});
    },
    [isHost, sessionId]
  );

  // Highlight dialog
  const highlightDialog = useCallback(
    (dialogId: string) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "session-event",
        payload: {
          type: "highlight_dialog",
          dialog_id: dialogId,
          user_id: user.id,
        } as BroadcastEvent,
      });
    },
    [user.id]
  );

  // Assign character (host only)
  const assignCharacter = useCallback(
    async (participantId: string, character: string, color: string) => {
      if (!isHost) return;
      await fetch(`/api/live-sessions/${sessionId}/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_character: character, assigned_color: color }),
      });
      loadParticipants();
    },
    [isHost, sessionId]
  );

  // Assign narrator (host only)
  const assignNarrator = useCallback(
    async (participantId: string) => {
      if (!isHost) return;
      // Clear narrator from all, then set on target
      const current = await (await fetch(`/api/live-sessions/${sessionId}/participants`)).json();
      await Promise.all(
        current.map((p: { id: string }) =>
          fetch(`/api/live-sessions/${sessionId}/participants/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_narrator: p.id === participantId }),
          })
        )
      );
      loadParticipants();
    },
    [isHost, sessionId]
  );

  // Start session (host only)
  const startSession = useCallback(async () => {
    if (!isHost) return;
    await fetch(`/api/live-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    setSession((s) => (s ? { ...s, status: "active" } : s));
    channelRef.current?.send({ type: "broadcast", event: "session-event", payload: { type: "session_start" } });
  }, [isHost, sessionId]);

  // End session (host only)
  const endSession = useCallback(async () => {
    if (!isHost) return;
    await fetch(`/api/live-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "finished" }),
    });
    setSession((s) => (s ? { ...s, status: "finished" } : s));
    channelRef.current?.send({ type: "broadcast", event: "session-event", payload: { type: "session_end" } });
  }, [isHost, sessionId]);

  // Leave session
  const leaveSession = useCallback(() => {
    voiceRef.current?.destroy();
    voiceRef.current = null;
    setVoiceReady(false);
    setPeers([]);

    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceRef.current?.destroy();
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
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
    highlightDialog,
    assignCharacter,
    assignNarrator,
    startSession,
    endSession,
    leaveSession,
  };
}
