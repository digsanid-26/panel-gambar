import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const where: any = {};
  if (scope === "mine") {
    if (!userId) return NextResponse.json([], { status: 200 });
    where.authorId = userId;
  } else if (scope === "public") {
    where.status = "published";
    where.visibility = "public";
  } else {
    where.OR = [
      { status: "published", visibility: "public" },
      ...(userId ? [{ authorId: userId }] : []),
    ];
  }

  const scenes = await prisma.arScene.findMany({ where, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(scenes);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const scene = await prisma.arScene.create({
    data: {
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
