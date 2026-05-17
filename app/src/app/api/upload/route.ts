import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "misc";
    const path = formData.get("path") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const allowedBuckets = ["panel-images", "audio", "avatars", "assets", "cover-images", "videos", "misc"];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "";
    const filename = path ?? `${session.user.id}/${Date.now()}.${ext}`;
    const destDir = join(UPLOAD_DIR, bucket, filename.split("/").slice(0, -1).join("/"));
    const destPath = join(UPLOAD_DIR, bucket, filename.replace(/\//g, "/"));
    const destFile = join(UPLOAD_DIR, bucket, ...filename.split("/"));

    await mkdir(join(UPLOAD_DIR, bucket, ...filename.split("/").slice(0, -1)), { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(destFile, Buffer.from(arrayBuffer));

    const publicUrl = `/uploads/${bucket}/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

