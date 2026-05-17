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
  return NextResponse.json({ ...ls, host_name: ls.host?.name });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const ls = await prisma.liveSession.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.current_panel_index !== undefined && { currentPanelIndex: body.current_panel_index }),
      ...(body.status === "finished" && { endedAt: new Date() }),
    },
  });
  return NextResponse.json(ls);
}
