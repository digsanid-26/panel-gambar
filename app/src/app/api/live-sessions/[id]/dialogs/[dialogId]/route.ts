import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/live-sessions/[id]/dialogs/[dialogId]
 * Allows any session participant to update the audio_url of a dialog
 * in the session's duplicated story (session_story_id).
 * Used for voice recording during live sessions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dialogId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId, dialogId } = await params;

  // Verify user is a participant in this session
  const participant = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  // Get the session to find the session story
  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const sessionStoryId = (liveSession as any).sessionStoryId as string | null;
  if (!sessionStoryId) return NextResponse.json({ error: "Session has no story copy" }, { status: 400 });

  // Verify dialog belongs to the session story
  const dialog = await prisma.dialog.findUnique({
    where: { id: dialogId },
    include: { panel: { select: { storyId: true } } },
  });
  if (!dialog || dialog.panel.storyId !== sessionStoryId) {
    return NextResponse.json({ error: "Dialog not in session story" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.audio_url) return NextResponse.json({ error: "audio_url required" }, { status: 400 });

  const updated = await prisma.dialog.update({
    where: { id: dialogId },
    data: { audioUrl: body.audio_url },
  });

  // Broadcast dialog_updated so other participants reload panels
  await prisma.sessionSignal.create({
    data: {
      sessionId,
      fromUserId: session.user.id,
      toUserId: null,
      event: "session-event",
      payload: { type: "dialog_updated", dialog_id: dialogId },
    },
  });

  return NextResponse.json({ id: updated.id, audio_url: updated.audioUrl });
}
