"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  Loader2,
  Radio,
  School,
  TrendingUp,
  Users,
  BookMarked,
} from "lucide-react";

interface Stats {
  users: { total: number; guru: number; siswa: number; member: number };
  stories: { total: number; published: number };
  classrooms: number;
  live_sessions: number;
  posts: number;
  schools: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}

function StatCard({ label, value, sub, icon, color, href }: StatCardProps) {
  const content = (
    <div className={`bg-surface border border-border rounded-2xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Dashboard Admin
        </h1>
        <p className="text-sm text-muted mt-1">Ringkasan statistik aplikasi secara keseluruhan</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-muted" />
        </div>
      ) : !stats ? (
        <p className="text-center text-muted py-20">Gagal memuat statistik.</p>
      ) : (
        <>
          {/* User stats */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Pengguna</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total Pengguna"
                value={stats.users.total}
                icon={<Users className="w-5 h-5 text-blue-600" />}
                color="bg-blue-50"
              />
              <StatCard
                label="Guru"
                value={stats.users.guru}
                sub="Role: guru"
                icon={<GraduationCap className="w-5 h-5 text-emerald-600" />}
                color="bg-emerald-50"
              />
              <StatCard
                label="Siswa"
                value={stats.users.siswa}
                sub="Role: siswa"
                icon={<Users className="w-5 h-5 text-violet-600" />}
                color="bg-violet-50"
              />
              <StatCard
                label="Member"
                value={stats.users.member}
                sub="Role: member"
                icon={<Users className="w-5 h-5 text-orange-500" />}
                color="bg-orange-50"
              />
            </div>
          </section>

          {/* Content stats */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Konten</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total Cerita"
                value={stats.stories.total}
                sub={`${stats.stories.published} dipublikasi`}
                icon={<BookOpen className="w-5 h-5 text-primary" />}
                color="bg-primary/10"
              />
              <StatCard
                label="Artikel & Panduan"
                value={stats.posts}
                icon={<FileText className="w-5 h-5 text-amber-600" />}
                color="bg-amber-50"
                href="/admin/posts"
              />
              <StatCard
                label="Sesi Live"
                value={stats.live_sessions}
                icon={<Radio className="w-5 h-5 text-red-500" />}
                color="bg-red-50"
              />
            </div>
          </section>

          {/* Institution stats */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Institusi</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard
                label="Sekolah"
                value={stats.schools}
                icon={<School className="w-5 h-5 text-teal-600" />}
                color="bg-teal-50"
              />
              <StatCard
                label="Kelas"
                value={stats.classrooms}
                icon={<Building2 className="w-5 h-5 text-cyan-600" />}
                color="bg-cyan-50"
              />
            </div>
          </section>

          {/* Quick links */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Aksi Cepat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/admin/posts"
                className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">Kelola Post</p>
                  <p className="text-xs text-muted">Buat, edit, hapus artikel & panduan</p>
                </div>
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <BookMarked className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">Pengaturan Fitur</p>
                  <p className="text-xs text-muted">Toggle fitur aplikasi (login Google, dll.)</p>
                </div>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
