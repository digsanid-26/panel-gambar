import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const participants = await prisma.sessionParticipant.findMany({
    where: { sessionId: id },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  return NextResponse.json(
    participants.map(({ user, ...p }) => ({
      ...p,
      user_name: user?.name,
      user_role: user?.role,
    }))
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const participant = await prisma.sessionParticipant.upsert({
    where: { sessionId_userId: { sessionId: id, userId: session.user.id } },
    create: { sessionId: id, userId: session.user.id },
    update: {},
  });
  return NextResponse.json(participant);
}
