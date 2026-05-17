import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const userId = session.user.id;

  const signals = await prisma.sessionSignal.findMany({
    where: {
      sessionId: params.id,
      OR: [{ toUserId: userId }, { toUserId: null }],
      NOT: { fromUserId: userId },
      ...(after && { createdAt: { gt: new Date(after) } }),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return NextResponse.json(signals);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const signal = await prisma.sessionSignal.create({
    data: {
      sessionId: params.id,
      fromUserId: session.user.id,
      toUserId: body.to_user_id ?? null,
      event: body.event,
      payload: body.payload,
    },
  });

  // Cleanup old signals (older than 30s) to keep table small
  await prisma.sessionSignal.deleteMany({
    where: {
      sessionId: params.id,
      createdAt: { lt: new Date(Date.now() - 30_000) },
    },
  });

  return NextResponse.json(signal);
}
