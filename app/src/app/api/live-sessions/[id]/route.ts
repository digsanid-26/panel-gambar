import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ls = await prisma.liveSession.findUnique({
    where: { id },
    include: {
      story: true,
      host: { select: { id: true, name: true } },
    },
  });
  if (!ls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lsAny = ls as any;
  return NextResponse.json({
    ...ls,
    host_id: ls.hostId,
    story_id: ls.storyId,
    session_story_id: lsAny.sessionStoryId ?? null,
    recording_token: lsAny.recordingToken ?? null,
    current_panel_index: ls.currentPanelIndex,
    host_name: ls.host?.name,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const isFinishing = body.status === "finished";
  const recordingToken = isFinishing ? crypto.randomUUID() : undefined;

  const ls = await prisma.liveSession.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.current_panel_index !== undefined && { currentPanelIndex: body.current_panel_index }),
      ...(isFinishing && { endedAt: new Date(), recordingToken }),
    },
  });
  return NextResponse.json({ ...ls, recording_token: ls.recordingToken });
}
