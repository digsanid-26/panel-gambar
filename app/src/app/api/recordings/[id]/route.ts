import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const recording = await prisma.recording.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.auto_active !== undefined && { autoActive: body.auto_active }),
    },
  });
  return NextResponse.json(recording);
}
