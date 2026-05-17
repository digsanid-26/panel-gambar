import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { UserProfile } from "@/lib/types";

export async function getCurrentSession() {
  return auth();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      schoolId: true,
      school: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserProfile["role"],
    avatar_url: user.avatarUrl ?? undefined,
    school_id: user.schoolId ?? undefined,
    school: user.school ?? undefined,
    created_at: user.createdAt.toISOString(),
  };
}
