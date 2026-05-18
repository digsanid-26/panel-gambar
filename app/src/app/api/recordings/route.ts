import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get("story_id");
  if (!storyId) return NextResponse.json([]);

  const recordings = await prisma.recording.findMany({
    where: { storyId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const result = recordings.map((r) => {
    const { student, ...rest } = r;
    return { ...rest, student_name: student?.name || "Unknown" };
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const recording = await prisma.recording.create({
    data: {
      studentId: session.user.id,
      storyId: body.story_id,
      panelId: body.panel_id,
      dialogId: body.dialog_id ?? null,
      type: body.type ?? "dialog",
      audioUrl: body.audio_url,
      ...(body.session_id && { sessionId: body.session_id }),
    },
  });
  return NextResponse.json(recording);
}
