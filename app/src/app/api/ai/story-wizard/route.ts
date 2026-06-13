import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const AKLAUDE_API = "https://api.aklaude.xyz/api/proxy/v1/chat/completions";

// ────────────────────────────────────────────────────────────────────────────
// Types for the wizard draft output
// ────────────────────────────────────────────────────────────────────────────

export interface WizardCharacter {
  id?: string;
  name: string;
  gender: "male" | "female" | "other";
  color: string;
  description: string;
}

export interface WizardDialog {
  character_name: string;
  text: string;
  position_x: number;
  position_y: number;
}

export interface WizardPanel {
  narration_text: string;
  dialogs: WizardDialog[];
}

export interface WizardDraft {
  title: string;
  description: string;
  theme: string;
  characters: WizardCharacter[];
  cp: string;
  tujuan_pembelajaran: string[];
  pertanyaan_pemantik: string[];
  kata_kunci: string[];
  panels: WizardPanel[];
}

// ────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["creator_ai_enabled", "creator_ai_text_gen", "ai_text_model"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["creator_ai_enabled"] !== "true" || map["creator_ai_text_gen"] === "false") {
    return NextResponse.json({ error: "Creator-AI tidak aktif" }, { status: 403 });
  }

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
    topic,
    level = "dasar",
    target_class = "Kelas 1-2",
    mata_pelajaran = "Bahasa Indonesia",
    panel_count = 5,
  } = body as {
    topic: string;
    level?: string;
    target_class?: string;
    mata_pelajaran?: string;
    panel_count?: number;
  };

  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic diperlukan" }, { status: 400 });
  }

  const safePanelCount = Math.min(Math.max(Number(panel_count) || 5, 3), 7);
  const model = map["ai_text_model"] ?? "claude-sonnet-4-6";
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key AI belum dikonfigurasi" }, { status: 500 });
  }

  const systemPrompt = `Kamu adalah AI asisten pembuatan cerita edukatif bergambar (komik/panel) untuk anak-anak SD Indonesia. 
Tugas kamu adalah membuat draft cerita lengkap dalam format JSON yang valid, sesuai Kurikulum Merdeka.
Bahasa: Indonesia. Konten aman untuk anak-anak SD. Karakter harus relatable untuk anak Indonesia.
Hanya kembalikan JSON, tidak ada teks lain di luar JSON.`;

  const userPrompt = `Buat cerita panel bergambar untuk:
- Topik: ${topic}
- Mata Pelajaran: ${mata_pelajaran}
- Tingkat: ${level}
- Target Kelas: ${target_class}
- Jumlah panel: ${safePanelCount}

Kembalikan JSON dengan format persis seperti ini (isi semua field, jangan ada yang kosong):
{
  "title": "Judul cerita yang menarik",
  "description": "Deskripsi singkat 1-2 kalimat tentang cerita",
  "theme": "salah satu dari: persahabatan / keluarga / lingkungan / kejujuran / kerja_keras / keberanian / umum",
  "characters": [
    {
      "name": "Nama karakter utama",
      "gender": "male atau female atau other",
      "color": "#hex warna bubble dialog (pilih warna cerah: #FF6B6B / #4ECDC4 / #45B7D1 / #96CEB4 / #FFEAA7 / #DDA0DD)",
      "description": "Deskripsi singkat karakter, usia, sifat"
    }
  ],
  "cp": "Capaian Pembelajaran sesuai Kurikulum Merdeka untuk ${mata_pelajaran} ${target_class}",
  "tujuan_pembelajaran": [
    "TP 1: ...",
    "TP 2: ...",
    "TP 3: ..."
  ],
  "pertanyaan_pemantik": [
    "Pertanyaan 1?",
    "Pertanyaan 2?"
  ],
  "kata_kunci": ["kata1", "kata2", "kata3", "kata4", "kata5"],
  "panels": [
    {
      "narration_text": "Teks narasi panel (1-3 kalimat, menggambarkan adegan)",
      "dialogs": [
        {
          "character_name": "Nama karakter (harus ada di daftar characters)",
          "text": "Teks dialog karakter",
          "position_x": 50,
          "position_y": 80
        }
      ]
    }
  ]
}

Ketentuan:
- Buat ${safePanelCount} panel yang membentuk alur cerita lengkap (pembukaan, konflik, resolusi, penutup)
- Setiap panel boleh punya 0-3 dialog
- Panel pertama: perkenalan karakter dan latar
- Panel terakhir: kesimpulan dan pesan moral
- Semua nama karakter di dialogs HARUS persis sama dengan yang ada di characters
- Buat minimal 2 karakter, maksimal 3
- Pesan moral sesuai topik dan nilai Pancasila`;

  const response = await fetch(AKLAUDE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("aKlaude story-wizard error:", err);
    return NextResponse.json({ error: "Gagal menghubungi layanan AI" }, { status: 502 });
  }

  const data = await response.json();
  const raw: string =
    data.content?.[0]?.text ??
    data.choices?.[0]?.message?.content ??
    "";

  // Parse JSON — strip markdown code fences if present
  let draft: WizardDraft;
  try {
    const jsonText = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    draft = JSON.parse(jsonText);
  } catch {
    console.error("Wizard JSON parse error. Raw:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI tidak mengembalikan format yang valid. Coba lagi." }, { status: 502 });
  }

  // Attach temp IDs to characters (for display only — real IDs on save)
  const draftWithIds = {
    ...draft,
    characters: (draft.characters ?? []).map((c) => ({ ...c, id: randomUUID() })),
    panels: (draft.panels ?? []).map((p) => ({ ...p, id: randomUUID() })),
  };

  return NextResponse.json({ draft: draftWithIds });
}
