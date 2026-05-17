import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const school = await prisma.school.findFirst({
    where: { teacherId: session.user.id },
  });
  return NextResponse.json(school ?? null);
}
