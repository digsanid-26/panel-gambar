import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/live-sessions/[id]/panels/[panelId]
 * Allows the assigned narrator (or host) to update the narration_audio_url
 * of a panel in the session's duplicated story.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; panelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId, panelId } = await params;

  // Verify user is a participant
  const participant = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId: session.user.id } },
  });
  if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  // Must be narrator or host
  const liveSession = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!liveSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const isHost = liveSession.hostId === session.user.id;
  const isNarrator = participant.isNarrator;
  if (!isHost && !isNarrator) {
    return NextResponse.json({ error: "Only narrator or host can record narration" }, { status: 403 });
  }

  const sessionStoryId = (liveSession as any).sessionStoryId as string | null;
  if (!sessionStoryId) return NextResponse.json({ error: "Session has no story copy" }, { status: 400 });

  // Verify panel belongs to the session story
  const panel = await prisma.panel.findUnique({ where: { id: panelId } });
  if (!panel || panel.storyId !== sessionStoryId) {
    return NextResponse.json({ error: "Panel not in session story" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.narration_audio_url) return NextResponse.json({ error: "narration_audio_url required" }, { status: 400 });

  const updated = await prisma.panel.update({
    where: { id: panelId },
    data: { narrationAudioUrl: body.narration_audio_url },
  });

  // Broadcast so other participants reload panels
  await prisma.sessionSignal.create({
    data: {
      sessionId,
      fromUserId: session.user.id,
      toUserId: null,
      event: "session-event",
      payload: { type: "dialog_updated", panel_id: panelId },
    },
  });

  return NextResponse.json({ id: updated.id, narration_audio_url: updated.narrationAudioUrl });
}
