import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function authorize(dialogId: string, userId: string) {
  const dialog = await prisma.dialog.findUnique({
    where: { id: dialogId },
    include: { panel: { include: { story: { select: { authorId: true } } } } },
  });
  if (!dialog || dialog.panel.story.authorId !== userId) return null;
  return dialog;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dialog = await authorize(id, session.user.id);
  if (!dialog) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const fieldMap: Record<string, string> = {
    order_index: "orderIndex",
    character_name: "characterName",
    character_color: "characterColor",
    audio_url: "audioUrl",
    bubble_style: "bubbleStyle",
    position_x: "positionX",
    position_y: "positionY",
    text_style: "textStyle",
  };

  const data: any = {};
  for (const [k, v] of Object.entries(fieldMap)) {
    if (k in body) data[v] = body[k];
  }
  if ("text" in body) data.text = body.text;

  const updated = await prisma.dialog.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dialog = await authorize(id, session.user.id);
  if (!dialog) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.dialog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
