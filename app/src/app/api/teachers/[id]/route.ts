import { prisma } from "@/lib/db";
import { transformPublicUser } from "@/lib/api-transform";
import { transformStory } from "@/lib/api-transform";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      subjects: true,
      location: true,
      school: true,
      schoolId: true,
      role: true,
      createdAt: true,
      _count: { select: { stories: { where: { status: "published" } } } },
    },
  });

  if (!user || user.role === "siswa") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stories = await prisma.story.findMany({
    where: { authorId: id, status: "published" },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { panels: true } } },
  });

  return NextResponse.json({
    ...transformPublicUser(user as any),
    stories: stories.map((s) => transformStory(s as any)),
  });
}
