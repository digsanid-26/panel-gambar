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
  const ls = await prisma.liveSession.create({
    data: {
      code: body.code,
      storyId: body.story_id,
      hostId: session.user.id,
      status: body.status ?? "waiting",
      currentPanelIndex: body.current_panel_index ?? 0,
    },
  });
  return NextResponse.json(ls);
}
