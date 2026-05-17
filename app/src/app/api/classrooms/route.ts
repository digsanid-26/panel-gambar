import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacher_id");

  const where: any = teacherId ? { teacherId } : { teacherId: session.user.id };

  const classrooms = await prisma.classroom.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, managedStudents: true } },
    },
  });
  return NextResponse.json(classrooms);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const code = body.code ?? Math.random().toString(36).substring(2, 8).toUpperCase();

  const classroom = await prisma.classroom.create({
    data: {
      name: body.name,
      code,
      teacherId: session.user.id,
      schoolId: body.school_id ?? null,
    },
  });
  return NextResponse.json(classroom);
}
