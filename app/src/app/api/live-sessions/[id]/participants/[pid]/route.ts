import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pid } = await params;
  const body = await request.json();
  const participant = await prisma.sessionParticipant.update({
    where: { id: pid },
    data: {
      ...(body.assigned_character !== undefined && { assignedCharacter: body.assigned_character }),
      ...(body.assigned_color !== undefined && { assignedColor: body.assigned_color }),
      ...(body.is_narrator !== undefined && { isNarrator: body.is_narrator }),
    },
  });
  return NextResponse.json(participant);
}
