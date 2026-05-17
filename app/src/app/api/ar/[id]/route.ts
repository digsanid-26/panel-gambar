import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scene = await prisma.arScene.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(scene);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.arScene.findUnique({ where: { id } });
  const isAdmin = (session.user as any).role === "admin";
  if (existing && existing.authorId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scene = await prisma.arScene.upsert({
    where: { id },
    update: {
      slug: body.slug,
      title: body.title,
      description: body.description ?? "",
      subject: body.subject ?? "lainnya",
      level: body.level ?? "SD",
      type: body.type,
      coverImage: body.cover_image ?? null,
      markerImage: body.marker_image ?? null,
      markerMindFile: body.marker_mind_file ?? null,
      instruction: body.instruction ?? null,
      assets: body.assets ?? [],
      status: body.status ?? "published",
      visibility: body.visibility ?? "public",
    },
    create: {
      id,
      slug: body.slug,
      title: body.title,
      description: body.description ?? "",
      subject: body.subject ?? "lainnya",
      level: body.level ?? "SD",
      type: body.type,
      coverImage: body.cover_image ?? null,
      markerImage: body.marker_image ?? null,
      markerMindFile: body.marker_mind_file ?? null,
      instruction: body.instruction ?? null,
      assets: body.assets ?? [],
      authorId: session.user.id,
      status: body.status ?? "published",
      visibility: body.visibility ?? "public",
    },
  });
  return NextResponse.json(scene);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const scene = await prisma.arScene.findUnique({ where: { id } });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = (session.user as any).role === "admin";
  if (scene.authorId !== session.user.id && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.arScene.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
