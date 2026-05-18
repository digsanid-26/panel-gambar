import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformPanel } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get("story_id");
  if (!storyId) return NextResponse.json({ error: "story_id required" }, { status: 400 });

  const panels = await prisma.panel.findMany({
    where: { storyId },
    orderBy: { orderIndex: "asc" },
    include: { dialogs: { orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json(panels.map(transformPanel));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const story = await prisma.story.findUnique({ where: { id: body.story_id } });
    if (!story || story.authorId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const count = await prisma.panel.count({ where: { storyId: body.story_id } });
    const panel = await prisma.panel.create({
      data: {
        storyId: body.story_id,
        orderIndex: body.order_index ?? count,
        panelType: body.panel_type ?? "simple",
        imageUrl: body.image_url ?? null,
        backgroundColor: body.background_color ?? "#f0f9ff",
        narrationText: body.narration_text ?? null,
        narrationAudioUrl: body.narration_audio_url ?? null,
        backgroundAudioUrl: body.background_audio_url ?? null,
        narrationOverlay: body.narration_overlay ?? undefined,
        timelineData: body.timeline_data ?? [],
        canvasData: body.canvas_data ?? undefined,
      },
      include: { dialogs: true },
    });
    return NextResponse.json(transformPanel(panel));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
