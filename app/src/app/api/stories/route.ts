import { auth } from "@/auth";
import { prisma } from "@/lib/db";
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

    const mapped = stories.map((s) => ({
      ...s,
      author_id: s.authorId,
      cover_image_url: s.coverImageUrl,
      video_trailer_url: s.videoTrailerUrl,
      target_class: s.targetClass,
      display_mode: s.displayMode,
      recording_mode: s.recordingMode,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      panels: Array.from({ length: s._count.panels }),
    }));

    return NextResponse.json(mapped);
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
    return NextResponse.json({ ...story, author_id: story.authorId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
