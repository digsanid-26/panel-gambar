import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school || school.teacherId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const updated = await prisma.school.update({
    where: { id },
    data: {
      name: body.name ?? school.name,
      address: body.address ?? school.address,
      city: body.city ?? school.city,
      province: body.province ?? school.province,
      postalCode: body.postal_code ?? school.postalCode,
      phone: body.phone ?? school.phone,
    },
  });
  return NextResponse.json(updated);
}
