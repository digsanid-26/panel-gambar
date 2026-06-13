"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Theme, Level, TargetClass } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { VideoTrailerUploader } from "@/components/ui/video-trailer-uploader";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { AiTextButton } from "@/components/ai/ai-text-button";
import { useCreatorAi } from "@/hooks/use-creator-ai";

export default function CreateStoryPage() {
  const router = useRouter();
  const ai = useCreatorAi();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [level, setLevel] = useState("");
  const [targetClass, setTargetClass] = useState("");
  const [kurikulum, setKurikulum] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("");
  const [semester, setSemester] = useState("");
  const [sumberCerita, setSumberCerita] = useState("");
  const [detailSumber, setDetailSumber] = useState("");
  const [informasiTambahan, setInformasiTambahan] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrlFromGallery, setCoverUrlFromGallery] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlFromAi, setVideoUrlFromAi] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dynamic options from DB
  const [themes, setThemes] = useState<Theme[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [targetClasses, setTargetClasses] = useState<TargetClass[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    async function loadOptions() {
      const [themeRes, levelRes, classRes] = await Promise.all([
        fetch("/api/themes").then((r) => r.json()),
        fetch("/api/levels").then((r) => r.json()),
        fetch("/api/target-classes").then((r) => r.json()),
      ]);

      const t = (themeRes || []) as Theme[];
      const l = (levelRes || []) as Level[];
      const c = (classRes || []) as TargetClass[];

      setThemes(t);
      setLevels(l);
      setTargetClasses(c);

      if (t.length > 0) setTheme(t[0].name);
      if (l.length > 0) setLevel(l[0].name);
      if (c.length > 0) setTargetClass(c[0].name);

      setOptionsLoading(false);
    }
    loadOptions();
  }, []);

  async function handleCoverUpload(file: File) {
    setCoverUrlFromGallery(null);
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleVideoUpload(file: File) {
    setVideoFile(file);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    let coverImageUrl: string | undefined;
    if (coverUrlFromGallery) {
      coverImageUrl = coverUrlFromGallery;
    } else if (coverFile) {
      setUploadingCover(true);
      const fd = new FormData(); fd.append("file", coverFile);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (up.ok) { const { url } = await up.json(); coverImageUrl = url; }
      setUploadingCover(false);
    }

    let videoTrailerUrl: string | undefined;
    if (videoUrlFromAi) {
      videoTrailerUrl = videoUrlFromAi;
    } else if (videoFile) {
      setUploadingVideo(true);
      const fd = new FormData(); fd.append("file", videoFile);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (up.ok) { const { url } = await up.json(); videoTrailerUrl = url; }
      setUploadingVideo(false);
    }

    const storyRes = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        theme,
        level,
        target_class: targetClass,
        kurikulum: kurikulum || null,
        mata_pelajaran: mataPelajaran || null,
        semester: semester || null,
        sumber_cerita: sumberCerita || null,
        detail_sumber: detailSumber || null,
        informasi_tambahan: informasiTambahan || null,
        cover_image_url: coverImageUrl,
        video_trailer_url: videoTrailerUrl,
        status: "draft",
      }),
    });

    if (!storyRes.ok) {
      const { error: errMsg } = await storyRes.json().catch(() => ({ error: "Gagal membuat cerita" }));
      setError(errMsg || "Gagal membuat cerita");
      setLoading(false);
      return;
    }
    const data = await storyRes.json();

    router.push(`/stories/${data.id}/edit`);
  }

  // Fallback options if DB tables don't exist yet
  const themeOptions = themes.length > 0
    ? themes.map((t) => ({ value: t.name, label: t.label }))
    : [{ value: "umum", label: "Umum" }];

  const levelOptions = levels.length > 0
    ? levels.map((l) => ({ value: l.name, label: l.description ? `${l.label} (${l.description})` : l.label }))
    : [{ value: "dasar", label: "Dasar" }];

  const classOptions = targetClasses.length > 0
    ? targetClasses.map((c) => ({ value: c.name, label: c.description ? `${c.label} (${c.description})` : c.label }))
    : [{ value: "kelas-1-2", label: "Kelas 1-2" }];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Buat Cerita Baru</h1>
        </div>

        <div className="bg-surface-card rounded-2xl border border-border p-6 sm:p-8">
          <form onSubmit={handleCreate} className="space-y-5">
            <CoverImageUploader
              currentUrl={coverUrlFromGallery || coverPreview || undefined}
              onUpload={handleCoverUpload}
              onRemove={() => { setCoverFile(null); setCoverPreview(null); setCoverUrlFromGallery(null); }}
              uploading={uploadingCover}
              onPickFromLibrary={(url) => { setCoverFile(null); setCoverPreview(null); setCoverUrlFromGallery(url); }}
            />

            <div className="space-y-1">
              <Input
                id="title"
                label="Judul Cerita"
                placeholder="Misal: Kelinci yang Rajin"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {ai.user_can_text && (
                <AiTextButton
                  task="title"
                  context={{ theme, target_class: targetClass, mata_pelajaran: mataPelajaran }}
                  onAccept={(v) => setTitle(v.split("\n")[0].replace(/^\d+\.\s*/, "").replace(/^"|"$/g, ""))}
                  promptPlaceholder="Misal: cerita tentang anak rajin yang suka membaca, untuk kelas 2 SD"
                  label="Bantu buat judul"
                />
              )}
            </div>

            <div className="space-y-1">
              <Textarea
                id="description"
                label="Deskripsi Singkat"
                placeholder="Ceritakan tentang apa cerita ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              {ai.user_can_text && (
                <AiTextButton
                  task="description"
                  context={{ story_title: title, theme }}
                  onAccept={setDescription}
                  promptPlaceholder="Misal: cerita tentang kelinci rajin yang membantu teman-temannya"
                  label="Bantu buat deskripsi"
                />
              )}
            </div>

            <VideoTrailerUploader
              currentUrl={videoUrlFromAi ?? (videoFile ? URL.createObjectURL(videoFile) : undefined)}
              onUpload={(f) => { setVideoUrlFromAi(null); handleVideoUpload(f); }}
              onRemove={() => { setVideoFile(null); setVideoUrlFromAi(null); }}
              uploading={uploadingVideo}
              coverImageUrl={coverUrlFromGallery ?? coverPreview ?? undefined}
              onAiGenerate={(url) => { setVideoFile(null); setVideoUrlFromAi(url); }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                id="theme"
                label="Tema"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                options={themeOptions}
              />

              <Select
                id="level"
                label="Level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                options={levelOptions}
              />

              <Select
                id="targetClass"
                label="Target Kelas"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                options={classOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="kurikulum"
                label="Kurikulum"
                placeholder="Misal: Kurikulum Merdeka"
                value={kurikulum}
                onChange={(e) => setKurikulum(e.target.value)}
              />
              <Input
                id="mataPelajaran"
                label="Mata Pelajaran"
                placeholder="Misal: Bahasa Indonesia"
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
              />
              <Select
                id="semester"
                label="Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                options={[
                  { value: "", label: "-- Pilih --" },
                  { value: "Semester 1", label: "Semester 1" },
                  { value: "Semester 2", label: "Semester 2" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="sumberCerita"
                label="Sumber Cerita"
                value={sumberCerita}
                onChange={(e) => setSumberCerita(e.target.value)}
                options={[
                  { value: "", label: "-- Pilih --" },
                  { value: "Karangan Sendiri", label: "Karangan Sendiri" },
                  { value: "Buku", label: "Buku" },
                  { value: "Novel", label: "Novel" },
                  { value: "Novel Online", label: "Novel Online" },
                  { value: "Film", label: "Film" },
                  { value: "Cerita Rakyat", label: "Cerita Rakyat" },
                  { value: "Lainnya", label: "Lainnya" },
                ]}
              />
              <Input
                id="detailSumber"
                label="Detail Sumber"
                placeholder="Nama buku, film, novel, seri, dll"
                value={detailSumber}
                onChange={(e) => setDetailSumber(e.target.value)}
              />
            </div>

            <Textarea
              id="informasiTambahan"
              label="Informasi Tambahan"
              placeholder="Catatan atau keterangan tambahan tentang cerita ini..."
              value={informasiTambahan}
              onChange={(e) => setInformasiTambahan(e.target.value)}
            />

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/dashboard">
                <Button variant="outline" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading || optionsLoading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Buat & Lanjut Edit Panel
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
