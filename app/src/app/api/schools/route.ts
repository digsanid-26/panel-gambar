import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const school = await prisma.school.create({
    data: {
      name: body.name,
      address: body.address ?? "",
      city: body.city ?? null,
      province: body.province ?? null,
      postalCode: body.postal_code ?? null,
      phone: body.phone ?? null,
      teacherId: session.user.id,
    },
  });
  return NextResponse.json(school);
}
