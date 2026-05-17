import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("class_id");

  const where: any = { teacherId: session.user.id };
  if (classId) where.classId = classId;

  const students = await prisma.managedStudent.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(students.map((s) => ({
    ...s,
    class_id: s.classId,
    teacher_id: s.teacherId,
    user_id: s.userId,
    avatar_url: s.avatarUrl,
    created_at: s.createdAt,
  })));
}
