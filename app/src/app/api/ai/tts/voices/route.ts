import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TOPMEDIAI_VOICES  = "https://api.topmediai.com/v1/voices_list";
const ELEVENLABS_VOICES = "https://api.elevenlabs.io/v1/voices";

export interface TtsVoice {
  id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  tags?: string[];
  is_free?: boolean;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["creator_ai_enabled", "creator_ai_tts_enabled", "ai_tts_provider"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["creator_ai_enabled"] !== "true" || map["creator_ai_tts_enabled"] === "false") {
    return NextResponse.json({ voices: [] });
  }

  const { searchParams } = new URL(request.url);
  const providerOverride = searchParams.get("provider");
  const provider = providerOverride ?? map["ai_tts_provider"] ?? "topmediai";
  const apiKey = process.env.AI_TTS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ voices: [], error: "AI_TTS_API_KEY belum dikonfigurasi" });
  }

  let voices: TtsVoice[] = [];

  // ── TopMediai ────────────────────────────────────────────────────────────
  if (provider === "topmediai") {
    const res = await fetch(TOPMEDIAI_VOICES, {
      headers: { "X-API-Key": apiKey },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const raw: Record<string, unknown>[] = data.Voice ?? [];
      // Filter to free voices or all; parse classnamearray for tags
      voices = raw.map((v) => {
        const tags = String(v.classnamearray ?? "").split(";").filter(Boolean);
        return {
          id: String(v.speaker ?? ""),
          name: String(v.name ?? ""),
          language: String(v.Languagename ?? ""),
          gender: tags.find((t) => t.toLowerCase() === "male" || t.toLowerCase() === "female")?.toLowerCase(),
          preview_url: v.urllist ? String(v.urllist) : undefined,
          tags,
          is_free: v.isFree === true,
        };
      }).filter((v) => v.id);
    }

  // ── ElevenLabs ───────────────────────────────────────────────────────────
  } else if (provider === "elevenlabs") {
    const res = await fetch(ELEVENLABS_VOICES, {
      headers: { "xi-api-key": apiKey },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      voices = (data.voices ?? []).map((v: Record<string, unknown>) => ({
        id: String(v.voice_id ?? ""),
        name: String(v.name ?? ""),
        language: "multilingual",
        preview_url: v.preview_url ? String(v.preview_url) : undefined,
        tags: (v.labels as Record<string, string>)
          ? Object.values(v.labels as Record<string, string>)
          : [],
        is_free: true,
      }));
    }
  }

  return NextResponse.json({ voices, provider });
}
