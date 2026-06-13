import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logAiUsage } from "@/lib/ai-logger";

const AKLAUDE_BASE = "https://api.aklaude.xyz/api/proxy";

const SYSTEM_PROMPT = `Kamu adalah asisten kreatif untuk guru yang membuat cerita bergambar pendidikan untuk anak-anak sekolah dasar Indonesia. Semua output harus:
- Menggunakan Bahasa Indonesia yang baik dan sesuai usia pembaca
- Bersifat positif, mendidik, dan sesuai nilai-nilai kebangsaan
- Tidak mengandung konten kekerasan, SARA, atau tidak pantas
- Singkat, padat, dan mudah dipahami
- Langsung ke poin tanpa penjelasan tambahan — hanya output yang diminta`;

const TASK_PROMPTS: Record<string, (ctx: Record<string, unknown>, userPrompt: string) => string> = {
  dialog: (ctx, userPrompt) =>
    `Cerita: "${ctx.story_title}" | Tema: ${ctx.story_theme} | Panel ke-${ctx.panel_index}
Narasi panel: ${ctx.narration ?? "-"}
Karakter: ${ctx.character_name} (${ctx.character_gender === "male" ? "laki-laki" : ctx.character_gender === "female" ? "perempuan" : "lainnya"})
Dialog sebelumnya: ${JSON.stringify(ctx.previous_dialogs ?? [])}
Tulis SATU baris dialog untuk karakter ${ctx.character_name} berdasarkan petunjuk: "${userPrompt}"
Hanya tulis teks dialognya saja, tanpa nama karakter atau tanda kutip.`,

  narration: (ctx, userPrompt) =>
    `Cerita: "${ctx.story_title}" | Tema: ${ctx.story_theme} | Level: ${ctx.level ?? "-"}
Panel ke-${ctx.panel_index ?? 1}
Tulis teks narasi panel berdasarkan petunjuk: "${userPrompt}"
Narasi harus singkat (1-3 kalimat), deskriptif, dan sesuai konteks cerita.`,

  title: (ctx, userPrompt) =>
    `Tema cerita: ${ctx.theme ?? userPrompt} | Kelas: ${ctx.target_class ?? "-"} | Mapel: ${ctx.mata_pelajaran ?? "-"}
Buat 3 pilihan judul cerita bergambar yang menarik untuk anak SD. Format: daftar bernomor saja.`,

  description: (ctx, userPrompt) =>
    `Judul cerita: "${ctx.story_title}" | Tema: ${ctx.theme ?? "-"}
Tulis sinopsis singkat cerita (2-3 kalimat) berdasarkan petunjuk: "${userPrompt}"`,

  character_description: (ctx, userPrompt) =>
    `Nama karakter: ${ctx.character_name} | Gender: ${ctx.character_gender}
Tulis deskripsi singkat karakter (1-2 kalimat) untuk cerita anak SD berdasarkan petunjuk: "${userPrompt}"`,

  cp: (ctx, _userPrompt) =>
    `Mapel: ${ctx.mata_pelajaran} | Kelas/Level: ${ctx.target_class ?? ctx.level} | Kurikulum: ${ctx.kurikulum ?? "Merdeka"}
Tulis Capaian Pembelajaran (CP) yang sesuai. Satu paragraf ringkas, mengacu pada profil pelajar Pancasila.`,

  tp: (ctx, _userPrompt) =>
    `Mapel: ${ctx.mata_pelajaran} | Kelas: ${ctx.target_class ?? ctx.level}
CP yang sudah ada: ${ctx.capaian_pembelajaran ?? "-"}
Tulis 3-5 Tujuan Pembelajaran (TP) sebagai daftar bernomor. Gunakan kata kerja operasional (mengidentifikasi, menjelaskan, menceritakan, dll).`,

  pertanyaan_pemantik: (ctx, _userPrompt) =>
    `Judul cerita: "${ctx.story_title}" | Tema: ${ctx.theme ?? "-"}
Tujuan Pembelajaran: ${JSON.stringify(ctx.tujuan_pembelajaran ?? [])}
Buat 3 pertanyaan pemantik yang membangkitkan rasa ingin tahu siswa SD. Format: daftar bernomor.`,

  kata_kunci: (ctx, _userPrompt) =>
    `Judul: "${ctx.story_title}" | Mapel: ${ctx.mata_pelajaran ?? "-"} | Tema: ${ctx.theme ?? "-"}
Buat 5-8 kata kunci relevan. Format: daftar kata/frasa dipisah koma.`,

  refleksi_siswa: (ctx, _userPrompt) =>
    `Judul cerita: "${ctx.story_title}" | Tujuan Pembelajaran: ${JSON.stringify(ctx.tujuan_pembelajaran ?? [])}
Buat 3-5 pertanyaan refleksi untuk siswa SD setelah membaca cerita. Format: daftar bernomor.`,

  refleksi_guru: (ctx, _userPrompt) =>
    `Judul cerita: "${ctx.story_title}" | Tujuan Pembelajaran: ${JSON.stringify(ctx.tujuan_pembelajaran ?? [])}
Buat 3 pertanyaan refleksi untuk guru setelah pembelajaran. Format: daftar bernomor.`,
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check global AI setting
  const aiSetting = await prisma.appSetting.findUnique({ where: { key: "creator_ai_enabled" } });
  if (aiSetting?.value !== "true") {
    return NextResponse.json({ error: "Creator-AI tidak aktif" }, { status: 403 });
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
  const { task, context = {}, user_prompt = "", max_tokens = 512 } = body as {
    task: string;
    context?: Record<string, unknown>;
    user_prompt?: string;
    max_tokens?: number;
  };

  if (!task) {
    return NextResponse.json({ error: "task diperlukan" }, { status: 400 });
  }

  // Build prompt
  const taskFn = TASK_PROMPTS[task];
  const userContent = taskFn
    ? taskFn(context, user_prompt)
    : user_prompt || "Bantu saya dengan tugas ini.";

  // Get model setting
  const modelSetting = await prisma.appSetting.findUnique({ where: { key: "ai_text_model" } });
  const model = modelSetting?.value ?? "claude-sonnet-4-6";

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key AI belum dikonfigurasi di server" }, { status: 500 });
  }

  const response = await fetch(`${AKLAUDE_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userContent },
      ],
      max_tokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("aKlaude error:", err);
    return NextResponse.json({ error: "Gagal menghubungi layanan AI" }, { status: 502 });
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;
  void logAiUsage({
    userId:       session.user.id,
    feature:      "text",
    model,
    inputTokens:  usage?.input_tokens ?? usage?.prompt_tokens,
    outputTokens: usage?.output_tokens ?? usage?.completion_tokens,
    metadata:     { task },
  });
  return NextResponse.json({ result });
}
