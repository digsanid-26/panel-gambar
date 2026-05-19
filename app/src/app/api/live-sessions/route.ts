// @ts-nocheck – sessionStoryId field available after prisma generate
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const status = searchParams.get("status");

  if (code) {
    const ls = await prisma.liveSession.findUnique({
      where: { code },
      include: { story: { select: { title: true, level: true } } },
    });
    if (!ls) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ls);
  }

  const where: Record<string, unknown> = { hostId: session.user.id };
  if (status === "active") where.status = { in: ["waiting", "active"] };

  const sessions = await prisma.liveSession.findMany({
    where,
    include: { story: { select: { title: true, level: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Deep-duplicate the original story so recordings replace audio in the session copy
  const original = await prisma.story.findUnique({
    where: { id: body.story_id },
    include: {
      panels: {
        orderBy: { orderIndex: "asc" },
        include: { dialogs: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  let sessionStoryId: string | undefined;
  if (original) {
    const sessionStory = await prisma.story.create({
      data: {
        title: original.title,
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
        visibility: "private",
        authorId: session.user.id,
      },
    });
    sessionStoryId = sessionStory.id;

    for (const panel of original.panels) {
      const newPanel = await prisma.panel.create({
        data: {
          storyId: sessionStory.id,
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
  }

  const ls = await prisma.liveSession.create({
    data: {
      code: body.code,
      storyId: body.story_id,
      hostId: session.user.id,
      status: body.status ?? "waiting",
      currentPanelIndex: body.current_panel_index ?? 0,
      ...(sessionStoryId && { sessionStoryId }),
    },
  });
  // @ts-ignore – sessionStoryId available after prisma generate
  return NextResponse.json({ ...ls, session_story_id: (ls as any).sessionStoryId });
}
