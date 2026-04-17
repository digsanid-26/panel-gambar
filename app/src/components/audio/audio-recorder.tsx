"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onSave: (blob: Blob) => void;
  onCancel?: () => void;
  className?: string;
}

// Audio processing constants
const HIGHPASS_FREQ = 80;      // Cut bass hum below 80Hz
const LOWPASS_FREQ = 14000;    // Cut harsh highs above 14kHz
const COMPRESSOR_THRESHOLD = -24;
const COMPRESSOR_KNEE = 12;
const COMPRESSOR_RATIO = 4;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.15;
const TARGET_BITRATE = 128000; // 128kbps for clear voice
const WARMUP_DELAY_MS = 300;   // Delay before recording to skip click/buzz transient
const WAVEFORM_BARS = 16;
const WAVEFORM_FFT_SIZE = 256;

export function AudioRecorder({ onSave, onCancel, className }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "preparing" | "recording" | "recorded" | "playing">("idle");
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(new Array(WAVEFORM_BARS).fill(0));

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioUrl = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioPipeline();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  function cleanupAudioPipeline() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
  }

  // Real-time waveform from AnalyserNode
  function startWaveformAnimation() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function animate() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      // Sample evenly across the frequency spectrum for the bars
      const step = Math.floor(dataArray.length / WAVEFORM_BARS);
      const bars: number[] = [];
      for (let i = 0; i < WAVEFORM_BARS; i++) {
        // Average a small range for smoother display
        let sum = 0;
        const start = i * step;
        const end = Math.min(start + step, dataArray.length);
        for (let j = start; j < end; j++) sum += dataArray[j];
        bars.push(sum / (end - start) / 255); // normalize 0..1
      }
      setWaveform(bars);
      animFrameRef.current = requestAnimationFrame(animate);
    }
    animate();
  }

  const startRecording = useCallback(async () => {
    try {
      // Request high-quality audio with noise processing
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Request high sample rate for clarity
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          channelCount: { ideal: 1 }, // Mono is better for voice (reduces noise, halves size)
        },
      });
      streamRef.current = stream;

      // Build Web Audio processing pipeline:
      //   mic → highpass (cut bass hum) → lowpass (cut harsh highs)
      //       → compressor (normalize volume) → destination (MediaRecorder)
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // High-pass filter: removes bass hum/rumble below 80Hz
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = HIGHPASS_FREQ;
      highpass.Q.value = 0.7;

      // Low-pass filter: removes harsh sibilance above 14kHz
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = LOWPASS_FREQ;
      lowpass.Q.value = 0.7;

      // Compressor: normalizes loud/soft parts for consistent volume
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = COMPRESSOR_THRESHOLD;
      compressor.knee.value = COMPRESSOR_KNEE;
      compressor.ratio.value = COMPRESSOR_RATIO;
      compressor.attack.value = COMPRESSOR_ATTACK;
      compressor.release.value = COMPRESSOR_RELEASE;

      // Start gain at ZERO to mute the click/buzz transient, will ramp up after delay
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;

      // Analyser for real-time waveform
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = WAVEFORM_FFT_SIZE;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      // Connect the chain: source → highpass → lowpass → compressor → gain → analyser → destination
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(destination);

      // Use the processed stream for recording
      const processedStream = destination.stream;

      // Choose best available codec with higher bitrate
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(processedStream, {
        mimeType,
        audioBitsPerSecond: TARGET_BITRATE,
      });

      audioChunks.current = [];
      setDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mimeType });
        audioUrl.current = URL.createObjectURL(blob);
        cleanupAudioPipeline();
        setState("recorded");
        setWaveform(new Array(WAVEFORM_BARS).fill(0));
      };

      mediaRecorder.current = recorder;
      setState("preparing");

      // Wait for click/buzz transient to dissipate, then start recording with gain ramp
      setTimeout(() => {
        if (mediaRecorder.current !== recorder) return; // cancelled during warmup
        recorder.start(100);
        // Ramp gain from 0 → 1.4 over 50ms for a clean fade-in
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1.4, audioCtx.currentTime + 0.05);
        setState("recording");

        // Start real-time waveform
        startWaveformAnimation();

        timerRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      }, WARMUP_DELAY_MS);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      cleanupAudioPipeline();
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
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const blob = new Blob(audioChunks.current, { type: mimeType });
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
      {/* Preparing indicator */}
      {state === "preparing" && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger animate-pulse" />
          <span className="text-xs text-muted">Mempersiapkan...</span>
        </div>
      )}

      {/* Real-time waveform visualization */}
      {state === "recording" && (
        <div className="flex items-end gap-[2px] h-7">
          {waveform.map((v, i) => (
            <div
              key={i}
              className="w-[3px] bg-danger rounded-full transition-all duration-75"
              style={{ height: `${Math.max(3, v * 28)}px` }}
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

        {state === "preparing" && (
          <Button variant="outline" size="icon" disabled title="Mempersiapkan...">
            <Mic className="w-4 h-4 animate-pulse" />
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
