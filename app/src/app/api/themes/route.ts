import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const themes = await prisma.theme.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(themes);
}
