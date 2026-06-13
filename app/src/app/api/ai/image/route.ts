import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const AKLAUDE_BASE = "https://api.aklaude.xyz/api/imagegen";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check global AI + image gen enabled
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["creator_ai_enabled", "creator_ai_image_gen", "ai_image_model"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["creator_ai_enabled"] !== "true") {
    return NextResponse.json({ error: "Creator-AI tidak aktif" }, { status: 403 });
  }
  if (map["creator_ai_image_gen"] === "false") {
    return NextResponse.json({ error: "Fitur generate gambar tidak aktif" }, { status: 403 });
  }

  // Check user access + tier (image requires pro or higher)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, creatorAiAccess: true, aiSubscriptionTier: true, aiSubscriptionEnd: true },
  });
  const subscriptionActive =
    user?.aiSubscriptionEnd !== null &&
    user?.aiSubscriptionEnd !== undefined &&
    new Date(user.aiSubscriptionEnd) > new Date();
  const tier = ["creator", "admin"].includes(user?.role ?? "") || user?.creatorAiAccess
    ? "full"
    : subscriptionActive ? (user?.aiSubscriptionTier ?? null) : null;
  const canImage = tier === "full" || tier === "pro" || tier === "max";

  if (!canImage) {
    return NextResponse.json({ error: "Akses generate gambar memerlukan paket Pro atau lebih tinggi" }, { status: 403 });
  }

  const body = await request.json();
  const {
    prompt,
    negative_prompt,
    width = 768,
    height = 512,
    style,
  } = body as {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    style?: string;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt diperlukan" }, { status: 400 });
  }

  const model = map["ai_image_model"] ?? "nano-banana-pro";
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key AI belum dikonfigurasi di server" }, { status: 500 });
  }

  // Build enhanced prompt with safety guardrails for children's content
  const safePrompt = `${prompt}, children's book illustration style, safe for children, colorful, friendly, educational${style ? `, ${style}` : ""}`;

  const response = await fetch(`${AKLAUDE_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: safePrompt,
      negative_prompt: negative_prompt ?? "violence, gore, adult content, scary, realistic photo",
      width,
      height,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("aKlaude image error:", err);
    return NextResponse.json({ error: "Gagal menghubungi layanan generate gambar" }, { status: 502 });
  }

  const data = await response.json();
  // aKlaude returns { url: string } or { images: [{ url }] }
  const imageUrl: string =
    data.url ??
    data.images?.[0]?.url ??
    data.data?.[0]?.url ??
    null;

  if (!imageUrl) {
    return NextResponse.json({ error: "Tidak ada gambar yang dihasilkan" }, { status: 502 });
  }

  return NextResponse.json({ url: imageUrl });
}
