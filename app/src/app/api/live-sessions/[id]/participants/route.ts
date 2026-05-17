import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const participants = await prisma.sessionParticipant.findMany({
    where: { sessionId: params.id },
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participant = await prisma.sessionParticipant.upsert({
    where: { sessionId_userId: { sessionId: params.id, userId: session.user.id } },
    create: { sessionId: params.id, userId: session.user.id },
    update: {},
  });
  return NextResponse.json(participant);
}
