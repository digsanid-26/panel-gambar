import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformStory } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const story = await prisma.story.findFirst({
    where: {
      id,
      OR: [
        { status: "published", visibility: "public" },
        ...(userId ? [{ authorId: userId }] : []),
      ],
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      panels: {
        orderBy: { orderIndex: "asc" },
        include: { dialogs: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(transformStory(story as any));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = (session.user as any).role === "admin";
  if (story.authorId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fieldMap: Record<string, string> = {
    cover_image_url: "coverImageUrl",
    video_trailer_url: "videoTrailerUrl",
    target_class: "targetClass",
    display_mode: "displayMode",
    recording_mode: "recordingMode",
    author_id: "authorId",
    mata_pelajaran: "mataPelajaran",
    sumber_cerita: "sumberCerita",
    detail_sumber: "detailSumber",
    informasi_tambahan: "informasiTambahan",
    capaian_pembelajaran: "capaianPembelajaran",
    tujuan_pembelajaran: "tujuanPembelajaran",
    pertanyaan_pemantik: "pertanyaanPemantik",
    alokasi_waktu: "alokasiWaktu",
    kata_kunci: "kataKunci",
    asesmen_jenis: "asesmenJenis",
    asesmen_deskripsi: "asesmenDeskripsi",
    refleksi_siswa: "refleksiSiswa",
    refleksi_guru: "refleksiGuru",
    sumber_belajar: "sumberBelajar",
    metode_pembelajaran: "metodePembelajaran",
    materi_pokok: "materiPokok",
    pendekatan_pembelajaran: "pendekatanPembelajaran",
    evaluasi_guru: "evaluasiGuru",
    link_quiz: "linkQuiz",
  };

  const data: any = {};
  for (const [snakeKey, prismaKey] of Object.entries(fieldMap)) {
    if (snakeKey in body) data[prismaKey] = body[snakeKey];
  }
  const directFields = ["title", "description", "theme", "level", "status", "visibility", "characters", "kurikulum", "semester", "glosarium"];
  for (const f of directFields) {
    if (f in body) data[f] = body[f];
  }

  const updated = await prisma.story.update({ where: { id }, data });
  return NextResponse.json(transformStory(updated as any));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = (session.user as any).role === "admin";
  if (story.authorId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.story.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
