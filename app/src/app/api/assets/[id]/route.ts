import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || asset.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const data: any = {};
  if ("name" in body) data.name = body.name;
  if ("visibility" in body) data.visibility = body.visibility;
  if ("tags" in body) data.tags = body.tags;
  if ("description" in body) data.description = body.description;

  const updated = await prisma.asset.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset || asset.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
