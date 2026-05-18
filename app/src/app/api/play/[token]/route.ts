import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const liveSession = await prisma.liveSession.findUnique({
    where: { recordingToken: token },
    include: {
      story: {
        include: {
          panels: {
            orderBy: { orderIndex: "asc" },
            include: {
              dialogs: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
      participants: {
        include: { user: { select: { id: true, name: true } } },
      },
      recordings: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
  });

  if (!liveSession) {
    return NextResponse.json({ error: "Rekaman tidak ditemukan" }, { status: 404 });
  }

  const participants = liveSession.participants.map(({ user, ...p }) => ({
    id: p.id,
    user_id: p.userId,
    user_name: user?.name,
    assigned_character: p.assignedCharacter,
    assigned_color: p.assignedColor,
    is_narrator: p.isNarrator,
  }));

  const recordingsByDialog: Record<string, string> = {};
  for (const rec of liveSession.recordings) {
    if (rec.dialogId) recordingsByDialog[rec.dialogId] = rec.audioUrl;
  }

  return NextResponse.json({
    id: liveSession.id,
    token,
    story: liveSession.story,
    participants,
    recordings_by_dialog: recordingsByDialog,
    ended_at: liveSession.endedAt,
  });
}
