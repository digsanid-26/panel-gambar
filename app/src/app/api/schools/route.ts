import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 30);
  const province = searchParams.get("province");
  const city = searchParams.get("city");
  const kecamatan = searchParams.get("kecamatan");

  const where: any = {};
  if (search.trim()) where.name = { contains: search.trim(), mode: "insensitive" };
  if (province) where.province = { contains: province, mode: "insensitive" };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (kecamatan) where.kecamatan = { contains: kecamatan, mode: "insensitive" };

  const schools = await prisma.school.findMany({
    where,
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true, name: true, address: true,
      kelurahan: true, kecamatan: true, city: true, province: true,
      provinsiCode: true, kabupatenCode: true, kecamatanCode: true, kelurahanCode: true,
      phone: true, teacherId: true,
    },
  });
  return NextResponse.json(schools);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const school = await prisma.school.create({
    data: {
      name: body.name,
      address: body.address ?? "",
      kelurahan: body.kelurahan ?? null,
      kecamatan: body.kecamatan ?? null,
      city: body.city ?? null,
      province: body.province ?? null,
      provinsiCode: body.provinsiCode ?? null,
      kabupatenCode: body.kabupatenCode ?? null,
      kecamatanCode: body.kecamatanCode ?? null,
      kelurahanCode: body.kelurahanCode ?? null,
      postalCode: body.postal_code ?? null,
      phone: body.phone ?? null,
      teacherId: session.user.id,
    },
  });
  return NextResponse.json(school);
}
