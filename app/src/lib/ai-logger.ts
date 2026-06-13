import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ─── Pricing (USD per unit) ──────────────────────────────────────────────────
// These are approximate aKlaude/provider costs — update as needed.

const COST_PER_1K_INPUT_TOKENS  = 0.003;   // Claude Haiku / similar
const COST_PER_1K_OUTPUT_TOKENS = 0.015;
const COST_PER_IMAGE             = 0.04;   // Flux / similar
const COST_PER_VIDEO_CLIP        = 0.50;   // Veo 8-second clip
const COST_PER_1K_TTS_CHARS      = 0.015;  // TopMediai / ElevenLabs

export type AiFeature = "text" | "image" | "video" | "tts" | "story-wizard" | "backsound";

export interface LogAiParams {
  userId: string;
  feature: AiFeature;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  charCount?: number;
  imageCount?: number;
  videoCount?: number;
  storyId?: string;
  metadata?: Record<string, unknown>;
}

export function estimateCost(params: LogAiParams): number {
  let cost = 0;

  if (params.inputTokens)  cost += (params.inputTokens  / 1000) * COST_PER_1K_INPUT_TOKENS;
  if (params.outputTokens) cost += (params.outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;
  if (params.charCount)    cost += (params.charCount     / 1000) * COST_PER_1K_TTS_CHARS;
  if (params.imageCount)   cost += params.imageCount * COST_PER_IMAGE;
  if (params.videoCount)   cost += params.videoCount * COST_PER_VIDEO_CLIP;

  return cost;
}

export async function logAiUsage(params: LogAiParams): Promise<void> {
  try {
    const estimatedCostUsd = estimateCost(params);

    await prisma.aiGenerationLog.create({
      data: {
        userId:           params.userId,
        feature:          params.feature,
        model:            params.model,
        inputTokens:      params.inputTokens,
        outputTokens:     params.outputTokens,
        charCount:        params.charCount,
        estimatedCostUsd: estimatedCostUsd > 0 ? estimatedCostUsd : undefined,
        storyId:          params.storyId,
        metadata:         (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-fatal — never let logging break the actual API response
  }
}
