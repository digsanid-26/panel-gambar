import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(school);
}

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
      kelurahan: "kelurahan" in body ? body.kelurahan : school.kelurahan,
      kecamatan: "kecamatan" in body ? body.kecamatan : school.kecamatan,
      city: "city" in body ? body.city : school.city,
      province: "province" in body ? body.province : school.province,
      provinsiCode: "provinsiCode" in body ? body.provinsiCode : school.provinsiCode,
      kabupatenCode: "kabupatenCode" in body ? body.kabupatenCode : school.kabupatenCode,
      kecamatanCode: "kecamatanCode" in body ? body.kecamatanCode : school.kecamatanCode,
      kelurahanCode: "kelurahanCode" in body ? body.kelurahanCode : school.kelurahanCode,
      postalCode: "postal_code" in body ? body.postal_code : school.postalCode,
      phone: "phone" in body ? body.phone : school.phone,
    },
  });
  return NextResponse.json(updated);
}
