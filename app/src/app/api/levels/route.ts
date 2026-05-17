import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const levels = await prisma.level.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(levels);
}
