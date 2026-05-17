import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/students/create
 * Creates a local account for a managed student.
 * Only callable by a logged-in guru/admin.
 *
 * Body: { name, username, email?, password, class_id }
 * Returns: { managed_student_id, user_id, profile_id }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!caller || (caller.role !== "guru" && caller.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: only guru/admin can create students" }, { status: 403 });
  }

  const body = await request.json();
  const { name, username, email, password, class_id } = body as {
    name: string; username: string; email?: string; password: string; class_id: string;
  };

  if (!name || !username || !password || !class_id) {
    return NextResponse.json({ error: "Missing required fields: name, username, password, class_id" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const studentEmail = email?.trim() || `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}+${Date.now()}@student.local`;

  try {
    const existing = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: { email: studentEmail, name, passwordHash, role: "siswa" },
    });

    await prisma.classroomMember.upsert({
      where: { classroomId_studentId: { classroomId: class_id, studentId: newUser.id } },
      update: {},
      create: { classroomId: class_id, studentId: newUser.id },
    });

    const ms = await prisma.managedStudent.create({
      data: {
        name,
        username,
        email: email?.trim() || null,
        classId: class_id,
        teacherId: session.user.id,
        userId: newUser.id,
      },
    });

    return NextResponse.json({
      managed_student_id: ms.id,
      user_id: newUser.id,
      profile_id: newUser.id,
      message: `Akun siswa "${name}" berhasil dibuat`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
