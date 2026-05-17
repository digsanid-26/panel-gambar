import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TABLE_MAP: Record<string, "theme" | "level" | "targetClass"> = {
  themes: "theme",
  levels: "level",
  target_classes: "targetClass",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "guru" && role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table } = await params;
  const model = TABLE_MAP[table];
  if (!model) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  const body = await request.json();
  const item = await (prisma[model] as any).create({ data: body });
  return NextResponse.json(item);
}
