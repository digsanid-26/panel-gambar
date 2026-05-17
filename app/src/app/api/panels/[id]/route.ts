import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function authorize(panelId: string, userId: string) {
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: { story: { select: { authorId: true } } },
  });
  if (!panel) return null;
  if (panel.story.authorId !== userId) return null;
  return panel;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const panel = await prisma.panel.findUnique({
    where: { id },
    include: { dialogs: { orderBy: { orderIndex: "asc" } } },
  });
  if (!panel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(panel);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const panel = await authorize(id, session.user.id);
  if (!panel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const fieldMap: Record<string, string> = {
    order_index: "orderIndex",
    panel_type: "panelType",
    image_url: "imageUrl",
    background_color: "backgroundColor",
    narration_text: "narrationText",
    narration_audio_url: "narrationAudioUrl",
    background_audio_url: "backgroundAudioUrl",
    narration_overlay: "narrationOverlay",
    timeline_data: "timelineData",
    canvas_data: "canvasData",
  };

  const data: any = {};
  for (const [k, v] of Object.entries(fieldMap)) {
    if (k in body) data[v] = body[k];
  }

  const updated = await prisma.panel.update({ where: { id }, data, include: { dialogs: true } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const panel = await authorize(id, session.user.id);
  if (!panel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.panel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
