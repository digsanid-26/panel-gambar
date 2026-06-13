import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TOPMEDIAI_TTS  = "https://api.topmediai.com/v1/text2speech";
const ELEVENLABS_TTS = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["creator_ai_enabled", "creator_ai_tts_enabled", "ai_tts_provider", "ai_tts_voice_id"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["creator_ai_enabled"] !== "true") {
    return NextResponse.json({ error: "Creator-AI tidak aktif" }, { status: 403 });
  }
  if (map["creator_ai_tts_enabled"] === "false") {
    return NextResponse.json({ error: "Fitur TTS tidak aktif" }, { status: 403 });
  }

  // Check user access
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, creatorAiAccess: true, aiSubscriptionEnd: true },
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
    text,
    voice_id,
    provider,
    emotion,
  } = body as {
    text: string;
    voice_id?: string;
    provider?: string;
    emotion?: string;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text diperlukan" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Teks maksimal 500 karakter per request TTS" }, { status: 400 });
  }

  const resolvedProvider = provider ?? map["ai_tts_provider"] ?? "topmediai";
  const resolvedVoiceId  = voice_id ?? map["ai_tts_voice_id"] ?? "";

  let audioBuffer: Buffer;
  let contentType = "audio/mpeg";

  // ── TopMediai ────────────────────────────────────────────────────────────
  if (resolvedProvider === "topmediai") {
    const apiKey = process.env.AI_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI_TTS_API_KEY belum dikonfigurasi" }, { status: 500 });
    }
    if (!resolvedVoiceId) {
      return NextResponse.json({ error: "voice_id diperlukan untuk TopMediai" }, { status: 400 });
    }

    const ttsRes = await fetch(TOPMEDIAI_TTS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        text,
        speaker: resolvedVoiceId,
        ...(emotion ? { emotion } : {}),
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("TopMediai TTS error:", err);
      return NextResponse.json({ error: "Gagal generate audio dari TopMediai" }, { status: 502 });
    }

    // TopMediai may return JSON with url or binary audio
    const ctype = ttsRes.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      const data = await ttsRes.json();
      const audioUrl = data.audio_url ?? data.url;
      if (!audioUrl) return NextResponse.json({ error: "TopMediai tidak mengembalikan URL audio" }, { status: 502 });
      return NextResponse.json({ url: audioUrl });
    }
    audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

  // ── ElevenLabs ───────────────────────────────────────────────────────────
  } else if (resolvedProvider === "elevenlabs") {
    const apiKey = process.env.AI_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI_TTS_API_KEY belum dikonfigurasi" }, { status: 500 });
    }
    const voiceId = resolvedVoiceId || "EXAVITQu4vr4xnSDxMaL";

    const ttsRes = await fetch(`${ELEVENLABS_TTS}/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("ElevenLabs TTS error:", err);
      return NextResponse.json({ error: "Gagal generate audio dari ElevenLabs" }, { status: 502 });
    }
    audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

  // ── OpenAI TTS ───────────────────────────────────────────────────────────
  } else if (resolvedProvider === "openai") {
    const apiKey = process.env.AI_TTS_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key TTS belum dikonfigurasi" }, { status: 500 });
    }
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: resolvedVoiceId || "nova",
        response_format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      return NextResponse.json({ error: "Gagal generate audio dari OpenAI TTS" }, { status: 502 });
    }
    audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

  } else {
    return NextResponse.json({ error: `Provider TTS '${resolvedProvider}' tidak didukung` }, { status: 400 });
  }

  // Upload binary audio ke storage internal
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: contentType });
  formData.append("file", blob, `tts_${Date.now()}.mp3`);
  formData.append("bucket", "audio");

  const uploadRes = await fetch(`${request.nextUrl.origin}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    return NextResponse.json({ error: "Gagal menyimpan file audio" }, { status: 500 });
  }
  const { url } = await uploadRes.json();
  return NextResponse.json({ url });
}
