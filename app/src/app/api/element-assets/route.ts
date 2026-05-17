import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get("story_id");
  if (!storyId) return NextResponse.json([], { status: 200 });

  const assets = await prisma.elementAsset.findMany({
    where: { storyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const asset = await prisma.elementAsset.create({
    data: {
      storyId: body.story_id,
      type: body.type,
      label: body.label,
      url: body.url,
      source: body.source ?? "upload",
      createdBy: session.user.id,
    },
  });
  return NextResponse.json(asset);
}
