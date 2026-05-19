// @ts-nocheck – new Prisma fields (recordingToken, sessionStoryId) available after prisma generate
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { recordingToken: token },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!liveSession) {
    return NextResponse.json({ error: "Rekaman tidak ditemukan" }, { status: 404 });
  }

  // Load session story copy (has recorded audio embedded) or fall back to original
  const sessionStoryId = (liveSession as any).sessionStoryId as string | null;
  const storyId = sessionStoryId || liveSession.storyId;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      panels: {
        orderBy: { orderIndex: "asc" },
        include: { dialogs: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  const participants = liveSession.participants.map(({ user, ...p }) => ({
    id: p.id,
    user_id: p.userId,
    user_name: user?.name,
    assigned_character: p.assignedCharacter,
    assigned_color: p.assignedColor,
    is_narrator: p.isNarrator,
  }));

  return NextResponse.json({
    id: liveSession.id,
    token,
    story,
    participants,
    ended_at: liveSession.endedAt,
  });
}
