import { NextRequest, NextResponse } from "next/server";

const BASE = "https://emsifa.github.io/api-wilayah-indonesia/api";

const cache = new Map<string, { data: unknown; exp: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchWilayah(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && hit.exp > Date.now()) return hit.data;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, exp: Date.now() + TTL });
  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  const parentId = searchParams.get("parentId");

  let url: string;
  if (level === "provinsi") {
    url = `${BASE}/provinces.json`;
  } else if (level === "kabupaten" && parentId) {
    url = `${BASE}/regencies/${parentId}.json`;
  } else if (level === "kecamatan" && parentId) {
    url = `${BASE}/districts/${parentId}.json`;
  } else if (level === "kelurahan" && parentId) {
    url = `${BASE}/villages/${parentId}.json`;
  } else {
    return NextResponse.json(
      { error: "Parameter tidak valid. Gunakan level=provinsi|kabupaten|kecamatan|kelurahan dan parentId jika diperlukan." },
      { status: 400 }
    );
  }

  try {
    const data = await fetchWilayah(url);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Gagal mengambil data wilayah." }, { status: 502 });
  }
}
