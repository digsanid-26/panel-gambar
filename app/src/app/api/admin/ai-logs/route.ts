import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const feature  = searchParams.get("feature") ?? undefined;
  const userId   = searchParams.get("user_id") ?? undefined;
  const dateFrom = searchParams.get("date_from");
  const dateTo   = searchParams.get("date_to");

  const where = {
    ...(feature  ? { feature }           : {}),
    ...(userId   ? { userId }            : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      },
    } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.aiGenerationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.aiGenerationLog.count({ where }),
  ]);

  // Summary aggregates for the current filter
  const summary = await prisma.aiGenerationLog.groupBy({
    by: ["feature"],
    where,
    _count:   { id: true },
    _sum:     { estimatedCostUsd: true, inputTokens: true, outputTokens: true, charCount: true },
  });

  return NextResponse.json({ logs, total, page, limit, summary });
}
