"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  label?: string;
  compact?: boolean;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
}

export function AudioPlayer({
  src,
  label,
  compact = false,
  autoPlay = false,
  className,
  onEnded,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      onEndedRef.current?.();
    };

    audio.addEventListener("loadedmetadata", handleMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    if (autoPlay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.src = "";
      audioRef.current = null;
    };
  }, [src, autoPlay]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  }, [duration]);

  const formatTime = (secs: number) => {
    if (!secs || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <button
        onClick={togglePlay}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
          isPlaying
            ? "bg-secondary text-white"
            : "bg-secondary/10 text-secondary hover:bg-secondary/20",
          className
        )}
      >
        {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
        {label || (isPlaying ? "Jeda" : "Dengar")}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-surface rounded-lg border border-border", className)}>
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary-dark transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      </button>

      <div className="flex-1 min-w-0">
        {label && <p className="text-xs font-medium text-foreground truncate mb-1">{label}</p>}
        <div
          className="h-1.5 bg-border rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-secondary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-muted">
            {formatTime(audioRef.current?.currentTime || 0)}
          </span>
          <span className="text-[10px] text-muted">{formatTime(duration)}</span>
        </div>
      </div>

      <button onClick={toggleMute} className="text-muted hover:text-foreground p-1 shrink-0">
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
