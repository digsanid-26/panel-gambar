import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const visibility = searchParams.get("visibility");

  const where: any = {
    OR: [{ ownerId: session.user.id }, { visibility: "public" }],
  };
  if (type) where.type = type;
  if (visibility) where.visibility = visibility;

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assets.map(({ sizeBytes, ...a }) => ({ ...a, sizeBytes: sizeBytes?.toString() ?? null })));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const asset = await prisma.asset.create({
    data: {
      ownerId: session.user.id,
      name: body.name,
      type: body.type,
      url: body.url,
      storagePath: body.storage_path ?? null,
      thumbnailUrl: body.thumbnail_url ?? null,
      mimeType: body.mime_type ?? null,
      sizeBytes: body.size_bytes ? BigInt(body.size_bytes) : null,
      visibility: body.visibility ?? "private",
      tags: body.tags ?? [],
      description: body.description ?? null,
      metadata: body.metadata ?? {},
    },
  });
  const { sizeBytes, ...rest } = asset;
  return NextResponse.json({ ...rest, sizeBytes: sizeBytes?.toString() ?? null });
}
