// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { VoiceEngine, type PeerState } from "./voice-engine";
import type {
  LiveSession,
  SessionParticipant,
  UserProfile,
  BroadcastEvent,
} from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
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

  const isHost = session?.host_id === user.id;

  // Load session data
  useEffect(() => {
    async function loadSession() {
      const { data, error: fetchError } = await supabase
        .from("live_sessions")
        .select("*, stories(*), profiles!live_sessions_host_id_fkey(name)")
        .eq("id", sessionId)
        .single();

      if (fetchError || !data) {
        setError("Sesi tidak ditemukan.");
        return;
      }

      setSession({
        ...data,
        story: data.stories,
        host_name: (data.profiles as { name: string } | null)?.name,
      } as unknown as LiveSession);
      setCurrentPanelIndex(data.current_panel_index);
    }
    loadSession();
  }, [sessionId]);

  // Load participants
  const loadParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("session_participants")
      .select("*, profiles!session_participants_user_id_fkey(name, role)")
      .eq("session_id", sessionId);

    if (data) {
      setParticipants(
        data.map((p: Record<string, unknown>) => ({
          ...p,
          user_name: (p.profiles as { name: string } | null)?.name,
          user_role: (p.profiles as { role: string } | null)?.role,
        })) as SessionParticipant[]
      );
    }
  }, [sessionId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Join as participant (if not host, register in DB)
  useEffect(() => {
    async function joinAsParticipant() {
      const { error: joinError } = await supabase
        .from("session_participants")
        .upsert(
          { session_id: sessionId, user_id: user.id },
          { onConflict: "session_id,user_id" }
        );
      if (joinError) console.warn("Join error:", joinError.message);
      loadParticipants();
    }
    if (session) joinAsParticipant();
  }, [session, user.id]);

  // Setup Supabase Realtime channel (presence + broadcast)
  useEffect(() => {
    if (!session) return;

    const channel = supabase.channel(`live-session:${sessionId}`, {
      config: { presence: { key: user.id } },
    });

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const list: PresenceState[] = [];
      Object.values(state).forEach((presences: unknown) => {
        (presences as unknown[]).forEach((p) => list.push(p as PresenceState));
      });
      setPresenceList(list);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.on("presence", { event: "join" }, (payload: any) => {
      // When a new peer joins, connect WebRTC
      const newPresences = (payload?.newPresences || []) as unknown[];
      newPresences.forEach((p: unknown) => {
        const presence = p as PresenceState;
        if (presence.user_id !== user.id && voiceRef.current) {
          voiceRef.current.connectToPeer(presence.user_id, presence.user_name);
        }
      });
      loadParticipants();
    });

    channel.on("presence", { event: "leave" }, () => {
      loadParticipants();
    });

    // Broadcast: panel navigation, dialog highlights, session control
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          setSession((s) => (s ? { ...s, status: "finished" } : s));
          break;
      }
    });

    // Poll participants periodically as a fallback for DB changes
    const pollInterval = setInterval(() => {
      loadParticipants();
    }, 5000);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: user.id,
          user_name: user.name,
          user_role: user.role,
          online_at: new Date().toISOString(),
        });
        setIsConnected(true);
      }
    });

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

      channelRef.current?.send({
        type: "broadcast",
        event: "session-event",
        payload: { type: "panel_change", panel_index: index } as BroadcastEvent,
      });

      supabase
        .from("live_sessions")
        .update({ current_panel_index: index })
        .eq("id", sessionId)
        .then(() => {});
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
      await supabase
        .from("session_participants")
        .update({ assigned_character: character, assigned_color: color })
        .eq("id", participantId);
      loadParticipants();
    },
    [isHost]
  );

  // Assign narrator (host only)
  const assignNarrator = useCallback(
    async (participantId: string) => {
      if (!isHost) return;
      // Remove narrator from others first
      await supabase
        .from("session_participants")
        .update({ is_narrator: false })
        .eq("session_id", sessionId);
      // Assign new narrator
      await supabase
        .from("session_participants")
        .update({ is_narrator: true })
        .eq("id", participantId);
      loadParticipants();
    },
    [isHost, sessionId]
  );

  // Start session (host only)
  const startSession = useCallback(async () => {
    if (!isHost) return;
    await supabase
      .from("live_sessions")
      .update({ status: "active" })
      .eq("id", sessionId);
    setSession((s) => (s ? { ...s, status: "active" } : s));

    channelRef.current?.send({
      type: "broadcast",
      event: "session-event",
      payload: { type: "session_start" } as BroadcastEvent,
    });
  }, [isHost, sessionId]);

  // End session (host only)
  const endSession = useCallback(async () => {
    if (!isHost) return;
    await supabase
      .from("live_sessions")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    setSession((s) => (s ? { ...s, status: "finished" } : s));

    channelRef.current?.send({
      type: "broadcast",
      event: "session-event",
      payload: { type: "session_end" } as BroadcastEvent,
    });
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
