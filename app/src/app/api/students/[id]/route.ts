import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ms = await prisma.managedStudent.findUnique({ where: { id } });
  if (!ms || ms.teacherId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const updated = await prisma.managedStudent.update({
    where: { id },
    data: {
      name: body.name,
      username: body.username,
      email: body.email ?? null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ms = await prisma.managedStudent.findUnique({ where: { id } });
  if (!ms || ms.teacherId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.managedStudent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
