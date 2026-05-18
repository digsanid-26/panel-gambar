import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformPost } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 0;
  while (await prisma.post.findUnique({ where: { slug } })) {
    i++;
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "admin";

  const where: any = {};
  if (type) where.type = type;
  if (status) {
    where.status = status;
  } else if (!isAdmin) {
    where.status = "published";
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(posts.map((p) => transformPost(p as any)));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const baseSlug = slugify(body.slug || body.title || "post");
    const slug = await uniqueSlug(baseSlug);

    const post = await prisma.post.create({
      data: {
        title: body.title ?? "Post Baru",
        slug,
        content: body.content ?? "",
        excerpt: body.excerpt ?? null,
        coverImageUrl: body.cover_image_url ?? null,
        type: body.type ?? "artikel",
        status: body.status ?? "draft",
        authorId: session.user.id,
        publishedAt: body.status === "published" ? new Date() : null,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return NextResponse.json(transformPost(post as any));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
