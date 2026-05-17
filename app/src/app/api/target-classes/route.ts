import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const classes = await prisma.targetClass.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(classes);
}
