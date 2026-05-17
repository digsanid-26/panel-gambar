import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/stories/duplicate
 * Deep-copies a published story (story + panels + dialogs) into the caller's account.
 * Audio URLs are preserved (shared references), but the new story is a draft owned by the caller.
 *
 * Body: { story_id: string }
 * Returns: { new_story_id: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!caller || (caller.role !== "guru" && caller.role !== "admin")) {
    return NextResponse.json({ error: "Hanya guru/admin yang bisa menduplikasi cerita" }, { status: 403 });
  }

  const body = await request.json();
  const { story_id } = body as { story_id: string };
  if (!story_id) return NextResponse.json({ error: "story_id required" }, { status: 400 });

  const original = await prisma.story.findUnique({
    where: { id: story_id },
    include: { panels: { orderBy: { orderIndex: "asc" }, include: { dialogs: { orderBy: { orderIndex: "asc" } } } } },
  });
  if (!original) return NextResponse.json({ error: "Cerita tidak ditemukan" }, { status: 404 });

  if (original.status !== "published" && original.authorId !== session.user.id) {
    return NextResponse.json({ error: "Hanya cerita yang sudah dipublikasi yang bisa diduplikasi" }, { status: 403 });
  }

  try {
    const newStory = await prisma.story.create({
      data: {
        title: `${original.title} (Salinan)`,
        description: original.description,
        coverImageUrl: original.coverImageUrl,
        videoTrailerUrl: original.videoTrailerUrl,
        theme: original.theme,
        level: original.level,
        targetClass: original.targetClass,
        displayMode: original.displayMode,
        characters: original.characters ?? [],
        recordingMode: original.recordingMode,
        kurikulum: original.kurikulum,
        mataPelajaran: original.mataPelajaran,
        semester: original.semester,
        sumberCerita: original.sumberCerita,
        detailSumber: original.detailSumber,
        informasiTambahan: original.informasiTambahan,
        capaianPembelajaran: original.capaianPembelajaran,
        tujuanPembelajaran: original.tujuanPembelajaran,
        pertanyaanPemantik: original.pertanyaanPemantik,
        alokasiWaktu: original.alokasiWaktu,
        kataKunci: original.kataKunci,
        asesmenJenis: original.asesmenJenis,
        asesmenDeskripsi: original.asesmenDeskripsi,
        refleksiSiswa: original.refleksiSiswa,
        refleksiGuru: original.refleksiGuru,
        sumberBelajar: original.sumberBelajar ?? [],
        glosarium: original.glosarium ?? [],
        metodePembelajaran: original.metodePembelajaran,
        materiPokok: original.materiPokok,
        pendekatanPembelajaran: original.pendekatanPembelajaran,
        evaluasiGuru: original.evaluasiGuru,
        linkQuiz: original.linkQuiz,
        status: "draft",
        authorId: session.user.id,
      },
    });

    for (const panel of original.panels) {
      const newPanel = await prisma.panel.create({
        data: {
          storyId: newStory.id,
          orderIndex: panel.orderIndex,
          panelType: panel.panelType,
          imageUrl: panel.imageUrl,
          backgroundColor: panel.backgroundColor,
          narrationText: panel.narrationText,
          narrationAudioUrl: panel.narrationAudioUrl,
          backgroundAudioUrl: panel.backgroundAudioUrl,
          narrationOverlay: panel.narrationOverlay ?? undefined,
          timelineData: panel.timelineData ?? [],
          canvasData: panel.canvasData ?? undefined,
        },
      });
      if (panel.dialogs.length > 0) {
        await prisma.dialog.createMany({
          data: panel.dialogs.map((d) => ({
            panelId: newPanel.id,
            orderIndex: d.orderIndex,
            characterName: d.characterName,
            characterColor: d.characterColor,
            text: d.text,
            audioUrl: d.audioUrl,
            bubbleStyle: d.bubbleStyle,
            positionX: d.positionX,
            positionY: d.positionY,
          })),
        });
      }
    }

    return NextResponse.json({
      new_story_id: newStory.id,
      message: `Cerita "${original.title}" berhasil diduplikasi`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
