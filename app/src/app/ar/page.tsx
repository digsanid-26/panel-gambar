"use client";

import Link from "next/link";
import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AR_SCENES } from "@/lib/ar/seed";
import { Box, Camera, Filter, Search, Sparkles } from "lucide-react";

const SUBJECTS = [
  { value: "", label: "Semua Mapel" },
  { value: "bahasa", label: "Bahasa Indonesia" },
  { value: "ipas", label: "IPAS" },
  { value: "sosial", label: "IPS / Sosial" },
  { value: "seni", label: "Seni Budaya" },
  { value: "lainnya", label: "Lainnya" },
];

const TYPE_LABELS: Record<string, string> = {
  marker: "AR Marker",
  markerless: "AR Ruangan",
  "model-only": "Model 3D",
};

export default function ARGalleryPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");

  const filtered = AR_SCENES.filter((s) => {
    if (subject && s.subject !== subject) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
                Panel AR
              </h1>
              <p className="text-xs text-muted">
                Jelajahi konten 3D & Augmented Reality untuk pembelajaran
              </p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <Box className="w-3.5 h-3.5" />
            Fase A · MVP · Konten Demo
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari scene AR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!pl-9"
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface-alt text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Tidak ada scene AR yang cocok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((scene) => (
              <Link
                key={scene.id}
                href={`/ar/${scene.slug}`}
                className="group rounded-2xl overflow-hidden bg-surface-card border border-border hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.coverImage}
                    alt={scene.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-medium">
                    {scene.type === "marker" ? (
                      <Camera className="w-3 h-3" />
                    ) : (
                      <Box className="w-3 h-3" />
                    )}
                    {TYPE_LABELS[scene.type] || scene.type}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-heading font-bold text-foreground line-clamp-1">
                    {scene.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2">
                    {scene.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="primary" className="text-[10px]">
                      {SUBJECTS.find((s) => s.value === scene.subject)?.label ?? scene.subject}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {scene.level}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info footer */}
        <div className="mt-8 p-4 bg-surface-card border border-border rounded-xl text-xs text-muted">
          <p className="font-semibold text-foreground mb-1">Tentang Panel AR</p>
          <p>
            Panel AR adalah perluasan dari Panel Cerita yang memungkinkan pembelajaran
            dengan objek 3D dan Augmented Reality. Fase A ini menampilkan konten demo
            (model 3D via CDN Khronos). Konten buatan guru akan tersedia di Fase B.
          </p>
        </div>
      </main>
    </div>
  );
}
