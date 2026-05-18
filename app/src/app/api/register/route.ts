import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }

    const allowedRoles = ["guru", "member"];
    const userRole = allowedRoles.includes(role) ? role : "member";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { name, email, passwordHash, role: userRole },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
