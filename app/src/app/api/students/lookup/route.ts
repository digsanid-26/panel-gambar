import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/students/lookup?username=xxx
 * Returns the email for a managed student by username (for username-based login).
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const userId = request.nextUrl.searchParams.get("user_id");

  if (username) {
    const ms = await prisma.managedStudent.findFirst({
      where: { username },
      include: { user: { select: { email: true } } },
    });
    if (!ms?.user?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ email: ms.user.email });
  }

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ email: user.email });
  }

  return NextResponse.json({ error: "username or user_id required" }, { status: 400 });
}
