import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformDialog } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const panelId = searchParams.get("panel_id");
  if (!panelId) return NextResponse.json({ error: "panel_id required" }, { status: 400 });

  const dialogs = await prisma.dialog.findMany({
    where: { panelId },
    orderBy: { orderIndex: "asc" },
  });
  return NextResponse.json(dialogs.map(transformDialog));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const panel = await prisma.panel.findUnique({
    where: { id: body.panel_id },
    include: { story: { select: { authorId: true } } },
  });
  if (!panel || panel.story.authorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await prisma.dialog.count({ where: { panelId: body.panel_id } });
  const dialog = await prisma.dialog.create({
    data: {
      panelId: body.panel_id,
      orderIndex: body.order_index ?? count,
      characterName: body.character_name ?? "Karakter",
      characterColor: body.character_color ?? "#3b82f6",
      text: body.text ?? "",
      audioUrl: body.audio_url ?? null,
      bubbleStyle: body.bubble_style ?? "oval",
      positionX: body.position_x ?? 50,
      positionY: body.position_y ?? 20,
      textStyle: body.text_style ?? undefined,
    },
  });
  return NextResponse.json(transformDialog(dialog as any));
}
