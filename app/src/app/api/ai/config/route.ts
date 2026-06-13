import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const AI_SETTING_KEYS = [
  "creator_ai_enabled",
  "creator_ai_text_gen",
  "creator_ai_kurikulum_gen",
  "creator_ai_image_gen",
  "creator_ai_tts_enabled",
  "creator_ai_video_gen",
  "ai_provider",
  "ai_text_model",
  "ai_image_model",
  "ai_video_model",
  "ai_tts_provider",
  "ai_tts_voice_id",
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings, user] = await Promise.all([
    prisma.appSetting.findMany({ where: { key: { in: AI_SETTING_KEYS } } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        creatorAiAccess: true,
        aiSubscriptionTier: true,
        aiSubscriptionEnd: true,
      },
    }),
  ]);

  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const globalEnabled = map["creator_ai_enabled"] === "true";

  // Determine per-user access
  const now = new Date();
  const subscriptionActive =
    user?.aiSubscriptionEnd !== null &&
    user?.aiSubscriptionEnd !== undefined &&
    new Date(user.aiSubscriptionEnd) > now;

  const userHasAiAccess =
    ["creator", "admin"].includes(user?.role ?? "") ||
    user?.creatorAiAccess === true ||
    subscriptionActive;

  // Determine tier: 'full' for role/manual, subscription tier otherwise
  const userAiTier: string | null = userHasAiAccess
    ? (["creator", "admin"].includes(user?.role ?? "") || user?.creatorAiAccess
        ? "full"
        : (user?.aiSubscriptionTier ?? null))
    : null;

  // Per-feature flags resolved against tier
  const canText  = userHasAiAccess; // all tiers include text
  const canImage = userHasAiAccess && (userAiTier === "full" || userAiTier === "pro" || userAiTier === "max");
  const canVideo = userHasAiAccess && (userAiTier === "full" || userAiTier === "max");
  const canTts   = userHasAiAccess; // all tiers include TTS when enabled globally

  return NextResponse.json({
    // Global flags (admin-controlled)
    creator_ai_enabled:       globalEnabled,
    creator_ai_text_gen:      map["creator_ai_text_gen"] !== "false",
    creator_ai_kurikulum_gen: map["creator_ai_kurikulum_gen"] !== "false",
    creator_ai_image_gen:     map["creator_ai_image_gen"] !== "false",
    creator_ai_tts_enabled:   map["creator_ai_tts_enabled"] === "true",
    creator_ai_video_gen:     map["creator_ai_video_gen"] === "true",
    // Model/provider config
    ai_provider:    map["ai_provider"]    ?? "aklaude",
    ai_text_model:  map["ai_text_model"]  ?? "claude-sonnet-4-6",
    ai_image_model: map["ai_image_model"] ?? "nano-banana-pro",
    ai_video_model: map["ai_video_model"] ?? "veo-3.1-fast",
    ai_tts_provider: map["ai_tts_provider"] ?? "elevenlabs",
    ai_tts_voice_id: map["ai_tts_voice_id"] ?? "",
    // Per-user access (resolved server-side — no API keys exposed)
    user_has_ai_access: globalEnabled && userHasAiAccess,
    user_ai_tier:       userAiTier,
    user_can_text:      globalEnabled && canText  && map["creator_ai_text_gen"]  !== "false",
    user_can_image:     globalEnabled && canImage && map["creator_ai_image_gen"] !== "false",
    user_can_video:     globalEnabled && canVideo && map["creator_ai_video_gen"] === "true",
    user_can_tts:       globalEnabled && canTts   && map["creator_ai_tts_enabled"] === "true",
  });
}
