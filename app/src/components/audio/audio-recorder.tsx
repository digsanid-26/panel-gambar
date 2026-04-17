"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onSave: (blob: Blob) => void;
  onCancel?: () => void;
  className?: string;
}

export function AudioRecorder({ onSave, onCancel, className }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "playing">("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioUrl = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunks.current = [];
      setDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        audioUrl.current = URL.createObjectURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        setState("recorded");
      };

      mediaRecorder.current = recorder;
      recorder.start(100);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Tidak dapat mengakses mikrofon. Pastikan izin mikrofon sudah diberikan.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playRecording = useCallback(() => {
    if (!audioUrl.current) return;
    const audio = new Audio(audioUrl.current);
    audioRef.current = audio;
    audio.onended = () => setState("recorded");
    audio.play();
    setState("playing");
  }, []);

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
    setState("recorded");
  }, []);

  const resetRecording = useCallback(() => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = "";
    audioChunks.current = [];
    setDuration(0);
    setState("idle");
  }, []);

  const saveRecording = useCallback(() => {
    const blob = new Blob(audioChunks.current, { type: "audio/webm" });
    onSave(blob);
    resetRecording();
  }, [onSave, resetRecording]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-surface rounded-xl border border-border", className)}>
      {/* Waveform visualization (simplified) */}
      {state === "recording" && (
        <div className="flex items-center gap-0.5 h-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-danger rounded-full waveform-bar"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {/* Duration */}
      <span className="text-sm font-mono text-muted min-w-[40px]">
        {formatTime(duration)}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1.5 ml-auto">
        {state === "idle" && (
          <Button variant="danger" size="icon" onClick={startRecording} title="Mulai Rekam">
            <Mic className="w-4 h-4" />
          </Button>
        )}

        {state === "recording" && (
          <Button variant="outline" size="icon" onClick={stopRecording} title="Berhenti">
            <Square className="w-4 h-4 fill-current" />
          </Button>
        )}

        {state === "recorded" && (
          <>
            <Button variant="ghost" size="icon" onClick={playRecording} title="Putar">
              <Play className="w-4 h-4 fill-current" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetRecording} title="Ulangi">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="accent" size="icon" onClick={saveRecording} title="Simpan">
              <Check className="w-4 h-4" />
            </Button>
          </>
        )}

        {state === "playing" && (
          <Button variant="ghost" size="icon" onClick={pausePlayback} title="Jeda">
            <Pause className="w-4 h-4 fill-current" />
          </Button>
        )}

        {onCancel && state === "idle" && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Batal
          </Button>
        )}
      </div>
    </div>
  );
}
