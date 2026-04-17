/**
 * WebRTC Voice Engine for Live Sessions
 * 
 * Uses a mesh topology: each participant connects directly to every other participant.
 * Supabase Realtime Broadcast is used as the signaling channel (no dedicated server needed).
 * 
 * Flow:
 *  1. User joins a Supabase Realtime channel for the session
 *  2. When a new peer appears (via presence), an RTCPeerConnection is created
 *  3. Offer/answer/ICE candidates are exchanged via broadcast
 *  4. Audio streams flow peer-to-peer
 */

import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PeerState {
  userId: string;
  userName: string;
  connection: RTCPeerConnection;
  audioStream?: MediaStream;
  audioElement?: HTMLAudioElement;
  speaking: boolean;
  muted: boolean;
}

interface VoiceEngineCallbacks {
  onPeerJoined?: (userId: string, userName: string) => void;
  onPeerLeft?: (userId: string) => void;
  onPeerSpeaking?: (userId: string, speaking: boolean) => void;
  onError?: (error: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class VoiceEngine {
  private channel: RealtimeChannel;
  private myUserId: string;
  private myUserName: string;
  private peers: Map<string, PeerState> = new Map();
  private localStream: MediaStream | null = null;
  private callbacks: VoiceEngineCallbacks;
  private isMuted = false;
  private audioContext: AudioContext | null = null;
  private analyserIntervals: Map<string, number> = new Map();

  constructor(
    channel: RealtimeChannel,
    myUserId: string,
    myUserName: string,
    callbacks: VoiceEngineCallbacks = {}
  ) {
    this.channel = channel;
    this.myUserId = myUserId;
    this.myUserName = myUserName;
    this.callbacks = callbacks;

    this.setupSignaling();
  }

  private setupSignaling() {
    this.channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }) => {
      if (!payload) return;
      const { type, from_user_id, from_user_name, to_user_id, data } = payload as {
        type: string;
        from_user_id: string;
        from_user_name: string;
        to_user_id: string;
        data: unknown;
      };

      if (to_user_id !== this.myUserId) return;

      switch (type) {
        case "offer":
          this.handleOffer(from_user_id, from_user_name, data as RTCSessionDescriptionInit);
          break;
        case "answer":
          this.handleAnswer(from_user_id, data as RTCSessionDescriptionInit);
          break;
        case "ice-candidate":
          this.handleIceCandidate(from_user_id, data as RTCIceCandidateInit);
          break;
      }
    });
  }

  async start(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.audioContext = new AudioContext();
    } catch (err) {
      this.callbacks.onError?.("Tidak dapat mengakses mikrofon. Pastikan izin mikrofon diberikan.");
      throw err;
    }
  }

  async connectToPeer(userId: string, userName: string): Promise<void> {
    if (userId === this.myUserId) return;
    if (this.peers.has(userId)) return;

    const pc = this.createPeerConnection(userId, userName);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.connection.addTrack(track, this.localStream!);
      });
    }

    try {
      const offer = await pc.connection.createOffer();
      await pc.connection.setLocalDescription(offer);

      this.channel.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: {
          type: "offer",
          from_user_id: this.myUserId,
          from_user_name: this.myUserName,
          to_user_id: userId,
          data: offer,
        },
      });
    } catch (err) {
      console.error("Error creating offer for", userId, err);
    }
  }

  private async handleOffer(
    fromUserId: string,
    fromUserName: string,
    offer: RTCSessionDescriptionInit
  ) {
    let peer = this.peers.get(fromUserId);
    if (!peer) {
      peer = this.createPeerConnection(fromUserId, fromUserName);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        const senders = peer!.connection.getSenders();
        const alreadyAdded = senders.some((s) => s.track === track);
        if (!alreadyAdded) {
          peer!.connection.addTrack(track, this.localStream!);
        }
      });
    }

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      this.channel.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: {
          type: "answer",
          from_user_id: this.myUserId,
          from_user_name: this.myUserName,
          to_user_id: fromUserId,
          data: answer,
        },
      });
    } catch (err) {
      console.error("Error handling offer from", fromUserId, err);
    }
  }

  private async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit) {
    const peer = this.peers.get(fromUserId);
    if (!peer) return;

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("Error handling answer from", fromUserId, err);
    }
  }

  private async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(fromUserId);
    if (!peer) return;

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate from", fromUserId, err);
    }
  }

  private createPeerConnection(userId: string, userName: string): PeerState {
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const peer: PeerState = {
      userId,
      userName,
      connection,
      speaking: false,
      muted: false,
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: {
            type: "ice-candidate",
            from_user_id: this.myUserId,
            from_user_name: this.myUserName,
            to_user_id: userId,
            data: event.candidate.toJSON(),
          },
        });
      }
    };

    connection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        peer.audioStream = remoteStream;

        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        (audio as unknown as Record<string, boolean>).playsInline = true;
        peer.audioElement = audio;
        audio.play().catch(() => {});

        this.setupSpeakingDetection(userId, remoteStream);
      }
    };

    connection.onconnectionstatechange = () => {
      if (
        connection.connectionState === "disconnected" ||
        connection.connectionState === "failed" ||
        connection.connectionState === "closed"
      ) {
        this.removePeer(userId);
      }
    };

    this.peers.set(userId, peer);
    this.callbacks.onPeerJoined?.(userId, userName);
    return peer;
  }

  private setupSpeakingDetection(userId: string, stream: MediaStream) {
    if (!this.audioContext) return;

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const interval = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const isSpeaking = average > 15;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          const peer = this.peers.get(userId);
          if (peer) peer.speaking = isSpeaking;
          this.callbacks.onPeerSpeaking?.(userId, isSpeaking);
        }
      }, 100);

      this.analyserIntervals.set(userId, interval);
    } catch (err) {
      console.warn("Speaking detection setup failed for", userId, err);
    }
  }

  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;

    peer.connection.close();
    peer.audioElement?.pause();
    if (peer.audioElement) peer.audioElement.srcObject = null;

    const interval = this.analyserIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.analyserIntervals.delete(userId);
    }

    this.peers.delete(userId);
    this.callbacks.onPeerLeft?.(userId);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getPeers(): Map<string, PeerState> {
    return this.peers;
  }

  getPeerList(): PeerState[] {
    return Array.from(this.peers.values());
  }

  destroy() {
    this.peers.forEach((_, userId) => this.removePeer(userId));
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserIntervals.forEach((interval) => clearInterval(interval));
    this.analyserIntervals.clear();
  }
}
