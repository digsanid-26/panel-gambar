import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformPost } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const post = await prisma.post.findFirst({
    where: isUUID ? { OR: [{ id }, { slug: id }] } : { slug: id },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "admin";
  if (post.status !== "published" && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(transformPost(post as any));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const data: any = {};
  if ("title" in body) data.title = body.title;
  if ("content" in body) data.content = body.content;
  if ("excerpt" in body) data.excerpt = body.excerpt;
  if ("cover_image_url" in body) data.coverImageUrl = body.cover_image_url;
  if ("type" in body) data.type = body.type;
  if ("status" in body) {
    data.status = body.status;
    if (body.status === "published") {
      data.publishedAt = new Date();
    }
  }

  const updated = await prisma.post.update({
    where: { id },
    data,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(transformPost(updated as any));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
