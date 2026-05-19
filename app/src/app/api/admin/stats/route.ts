import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalUsers,
    guruCount,
    siswaCount,
    memberCount,
    storyCount,
    publishedStoryCount,
    classroomCount,
    liveSessionCount,
    postCount,
    schoolCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "guru" } }),
    prisma.user.count({ where: { role: "siswa" } }),
    prisma.user.count({ where: { role: "member" } }),
    prisma.story.count(),
    prisma.story.count({ where: { status: "published" } }),
    prisma.classroom.count(),
    prisma.liveSession.count(),
    prisma.post.count(),
    prisma.school.count(),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, guru: guruCount, siswa: siswaCount, member: memberCount },
    stories: { total: storyCount, published: publishedStoryCount },
    classrooms: classroomCount,
    live_sessions: liveSessionCount,
    posts: postCount,
    schools: schoolCount,
  });
}
