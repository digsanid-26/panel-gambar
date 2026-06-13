import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logAiUsage } from "@/lib/ai-logger";

const AKLAUDE_VIDEOGEN = "https://api.aklaude.xyz/api/videogen/generate";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check global AI + video gen flags
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["creator_ai_enabled", "creator_ai_video_gen", "ai_video_model"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["creator_ai_enabled"] !== "true") {
    return NextResponse.json({ error: "Creator-AI tidak aktif" }, { status: 403 });
  }
  if (map["creator_ai_video_gen"] === "false") {
    return NextResponse.json({ error: "Fitur generate video tidak aktif" }, { status: 403 });
  }

  // Check user access
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, creatorAiAccess: true, aiSubscriptionTier: true, aiSubscriptionEnd: true },
  });
  const subscriptionActive =
    user?.aiSubscriptionEnd !== null &&
    user?.aiSubscriptionEnd !== undefined &&
    new Date(user.aiSubscriptionEnd) > new Date();
  const canAccess =
    ["creator", "admin"].includes(user?.role ?? "") ||
    user?.creatorAiAccess === true ||
    subscriptionActive;

  if (!canAccess) {
    return NextResponse.json({ error: "Akses Creator-AI tidak tersedia untuk akun ini" }, { status: 403 });
  }

  const body = await request.json();
  const {
    prompt,
    ratio = "16:9",
    resolution = "720p",
    image,
  } = body as {
    prompt: string;
    ratio?: "16:9" | "9:16";
    resolution?: "720p" | "1080p";
    image?: string;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt diperlukan" }, { status: 400 });
  }

  const model = map["ai_video_model"] ?? "veo-3.1-fast";
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key AI belum dikonfigurasi di server" }, { status: 500 });
  }

  // Build enhanced prompt with child-safety context
  const safePrompt = `${prompt}, children's educational content, safe for school, colorful and friendly animation style`;

  const requestBody: Record<string, unknown> = {
    model,
    prompt: safePrompt,
    ratio,
    duration: "8s",
    resolution,
    n: 1,
  };
  if (image) {
    requestBody.image = image;
  }

  const response = await fetch(AKLAUDE_VIDEOGEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("aKlaude videogen error:", err);
    return NextResponse.json({ error: "Gagal menghubungi layanan generate video" }, { status: 502 });
  }

  const data = await response.json();
  // aKlaude returns { data: [{ url }] }
  const videoUrl: string = data.data?.[0]?.url ?? data.url ?? null;

  if (!videoUrl) {
    return NextResponse.json({ error: "Tidak ada video yang dihasilkan" }, { status: 502 });
  }

  void logAiUsage({
    userId:     session.user.id,
    feature:    "video",
    model:      body?.model ?? "veo-2",
    videoCount: 1,
    metadata:   { prompt: String(body?.prompt ?? "").slice(0, 100) },
  });
  return NextResponse.json({ url: videoUrl });
}
