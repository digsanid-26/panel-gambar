import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TABLE_MAP: Record<string, "theme" | "level" | "targetClass"> = {
  themes: "theme",
  levels: "level",
  target_classes: "targetClass",
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "guru" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table, id } = await params;
  const model = TABLE_MAP[table];
  if (!model) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = { ...body };
  if ("is_active" in data) { data.isActive = data.is_active; delete data.is_active; }
  if ("sort_order" in data) { data.sortOrder = data.sort_order; delete data.sort_order; }
  const updated = await (prisma[model] as any).update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "guru" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table, id } = await params;
  const model = TABLE_MAP[table];
  if (!model) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  await (prisma[model] as any).delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
