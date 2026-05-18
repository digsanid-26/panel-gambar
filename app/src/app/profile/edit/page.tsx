"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { ArrowLeft, Save, Loader2, Plus, X, User } from "lucide-react";

interface UserProfile {
  id: string; name: string; email: string; role: string;
  avatar_url?: string; bio?: string; subjects: string[];
  location?: string; school?: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [school, setSchool] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    loadProfile();
  }, [session, status]);

  async function loadProfile() {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data: UserProfile = await res.json();
      setProfile(data);
      setName(data.name ?? "");
      setBio(data.bio ?? "");
      setLocation(data.location ?? "");
      setSchool(data.school ?? "");
      setAvatarUrl(data.avatar_url ?? "");
      setSubjects(data.subjects ?? []);
      setRole(data.role ?? "member");
    }
    setLoading(false);
  }

  async function handleAvatarUpload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) { const { url } = await res.json(); setAvatarUrl(url); }
  }

  function addSubject() {
    const s = subjectInput.trim();
    if (s && !subjects.includes(s)) { setSubjects([...subjects, s]); }
    setSubjectInput("");
  }

  async function handleSave() {
    if (!name.trim()) { setError("Nama wajib diisi."); return; }
    setError("");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, location, school, avatar_url: avatarUrl || null, subjects, role }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError("Gagal menyimpan profil.");
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="flex-1 text-2xl font-bold">Edit Profil</h1>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "Tersimpan ✓" : "Simpan"}
          </Button>
        </div>

        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">{error}</div>}

        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-surface-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Foto Profil</h2>
            <div className="flex items-center gap-5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-border flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border-4 border-border">
                  <User className="w-8 h-8 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <CoverImageUploader
                  currentUrl={avatarUrl || undefined}
                  onUpload={handleAvatarUpload}
                  onRemove={() => setAvatarUrl("")}
                  onPickFromLibrary={(url) => setAvatarUrl(url)}
                />
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="bg-surface-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold">Informasi Dasar</h2>
            <Input label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda..." />
            <Input label="Sekolah / Institusi" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Nama sekolah..." />
            <Input label="Kota / Lokasi" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Misal: Surabaya, Jawa Timur" />
            <Textarea
              label="Bio Singkat"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ceritakan tentang diri Anda sebagai guru..."
              rows={3}
            />
          </div>

          {/* Subjects */}
          <div className="bg-surface-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-3">Mata Pelajaran yang Diajarkan</h2>
            <div className="flex gap-2 mb-3">
              <input
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Misal: Bahasa Indonesia, Matematika..."
              />
              <Button variant="outline" onClick={addSubject} type="button">
                <Plus className="w-4 h-4" /> Tambah
              </Button>
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-secondary/15 text-secondary-dark text-sm px-3 py-1 rounded-full">
                    {s}
                    <button onClick={() => setSubjects(subjects.filter((x) => x !== s))} className="hover:text-danger ml-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Role upgrade for member */}
          {profile && (profile.role === "member" || role !== profile.role) && (
            <div className="bg-surface-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold mb-1">Peran Akun</h2>
              <p className="text-xs text-muted mb-3">Akun Guru dapat membuat cerita, mengelola kelas, dan menambahkan siswa.</p>
              <div className="grid grid-cols-2 gap-2">
                {(["member", "guru"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      role === r
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted hover:border-primary/30"
                    }`}
                  >
                    {r === "guru" ? "👩\u200d🏫 Guru" : "👤 Member"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account info */}
          {profile && (
            <div className="bg-surface-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold mb-3">Informasi Akun</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Email</span>
                  <span className="font-medium">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Peran saat ini</span>
                  <span className="font-medium capitalize">{profile.role}</span>
                </div>
                {profile.role === "guru" && profile.id && (
                  <div className="flex justify-between">
                    <span className="text-muted">Halaman Profil Publik</span>
                    <Link href={`/teachers/${profile.id}`} className="text-primary hover:underline text-xs">Lihat profil publik →</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
