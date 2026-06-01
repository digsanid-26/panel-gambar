import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { transformStory } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const isAdmin = (session?.user as any)?.role === "admin";
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get("author_id");
    const status = searchParams.get("status");
    const theme = searchParams.get("theme");
    const level = searchParams.get("level");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const page = parseInt(searchParams.get("page") ?? "1");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (isAdmin) {
      // Admin sees all stories regardless of status/visibility
      if (authorId) where.authorId = authorId;
    } else if (authorId) {
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
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { panels: true } },
        },
      }),
      isAdmin ? prisma.story.count({ where }) : Promise.resolve(0),
    ]);

    const result = stories.map((s) => transformStory(s as any));
    if (isAdmin) {
      return NextResponse.json({ stories: result, total, page, limit });
    }
    return NextResponse.json(result);
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
