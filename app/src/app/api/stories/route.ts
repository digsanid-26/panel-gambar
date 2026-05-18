import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformStory } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get("author_id");
    const status = searchParams.get("status");
    const theme = searchParams.get("theme");
    const level = searchParams.get("level");
    const limit = parseInt(searchParams.get("limit") ?? "100");

    const where: any = {};
    if (authorId) {
      where.authorId = authorId;
    } else {
      where.OR = [
        { status: "published", visibility: "public" },
        ...(userId ? [{ authorId: userId }] : []),
      ];
    }
    if (status) where.status = status;
    if (theme) where.theme = theme;
    if (level) where.level = level;

    const stories = await prisma.story.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { panels: true } },
      },
    });

    return NextResponse.json(stories.map((s) => transformStory(s as any)));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const story = await prisma.story.create({
      data: {
        title: body.title ?? "Cerita Baru",
        description: body.description ?? "",
        authorId: session.user.id,
        theme: body.theme ?? "umum",
        level: body.level ?? "dasar",
        targetClass: body.target_class ?? "Kelas 1-2",
        status: body.status ?? "draft",
        visibility: body.visibility ?? "public",
        displayMode: body.display_mode ?? "slide",
        coverImageUrl: body.cover_image_url ?? null,
      },
    });
    return NextResponse.json(transformStory(story as any));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
