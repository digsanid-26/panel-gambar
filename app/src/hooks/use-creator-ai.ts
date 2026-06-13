"use client";

import { useEffect, useState } from "react";

export interface CreatorAiConfig {
  // Global flags
  creator_ai_enabled: boolean;
  creator_ai_text_gen: boolean;
  creator_ai_kurikulum_gen: boolean;
  creator_ai_image_gen: boolean;
  creator_ai_tts_enabled: boolean;
  creator_ai_video_gen: boolean;
  // Provider/model
  ai_provider: string;
  ai_text_model: string;
  ai_image_model: string;
  ai_video_model: string;
  ai_tts_provider: string;
  ai_tts_voice_id: string;
  // Per-user resolved flags
  user_has_ai_access: boolean;
  user_ai_tier: string | null;
  user_can_text: boolean;
  user_can_image: boolean;
  user_can_video: boolean;
  user_can_tts: boolean;
}

const DEFAULT_CONFIG: CreatorAiConfig = {
  creator_ai_enabled: false,
  creator_ai_text_gen: false,
  creator_ai_kurikulum_gen: false,
  creator_ai_image_gen: false,
  creator_ai_tts_enabled: false,
  creator_ai_video_gen: false,
  ai_provider: "aklaude",
  ai_text_model: "claude-sonnet-4-6",
  ai_image_model: "nano-banana-pro",
  ai_video_model: "veo-3.1-fast",
  ai_tts_provider: "elevenlabs",
  ai_tts_voice_id: "",
  user_has_ai_access: false,
  user_ai_tier: null,
  user_can_text: false,
  user_can_image: false,
  user_can_video: false,
  user_can_tts: false,
};

export function useCreatorAi() {
  const [config, setConfig] = useState<CreatorAiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/config")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) setConfig({ ...DEFAULT_CONFIG, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...config, loading };
}
