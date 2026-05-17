import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, schoolId: true, school: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatarUrl,
    school_id: user.schoolId,
    school: user.school,
    created_at: user.createdAt,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const data: any = {};
  if ("name" in body) data.name = body.name;
  if ("avatar_url" in body) data.avatarUrl = body.avatar_url;
  if ("school" in body) data.school = body.school;
  if ("school_id" in body) data.schoolId = body.school_id;
  if ("role" in body) {
    const allowedRoles = ["guru", "siswa"];
    if (allowedRoles.includes(body.role)) data.role = body.role;
  }

  const updated = await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
}
