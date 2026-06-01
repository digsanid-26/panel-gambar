"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Trash2,
  User,
} from "lucide-react";

interface AdminStory {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  visibility: "public" | "private";
  theme: string;
  level: string;
  author_name?: string;
  author_id: string;
  panel_count?: number;
  updated_at: string;
}

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "published", label: "Dipublikasi" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Diarsipkan" },
];

const STATUS_BADGE: Record<string, { label: string; variant: "primary" | "outline" | "secondary" }> = {
  published: { label: "Dipublikasi", variant: "primary" },
  draft: { label: "Draft", variant: "outline" },
  archived: { label: "Diarsipkan", variant: "secondary" },
};

const LIMIT = 20;

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, s: string, st: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), page: String(p) });
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    const res = await fetch(`/api/stories?${params}`);
    if (res.ok) {
      const data = await res.json();
      setStories(data.stories ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(page, search, statusFilter); }, [page, search, statusFilter, load]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  function handleTab(val: string) {
    setStatusFilter(val);
    setPage(1);
  }

  async function handleToggleStatus(story: AdminStory) {
    const next = story.status === "published" ? "draft" : "published";
    setActing(story.id);
    const res = await fetch(`/api/stories/${story.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, status: next } : s))
      );
    }
    setActing(null);
  }

  async function handleArchive(story: AdminStory) {
    setActing(story.id);
    const res = await fetch(`/api/stories/${story.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (res.ok) {
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, status: "archived" } : s))
      );
    }
    setActing(null);
  }

  async function handleDelete(story: AdminStory) {
    if (!confirm(`Hapus cerita "${story.title}"?\nTindakan ini tidak dapat dibatalkan.`)) return;
    setActing(story.id);
    const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
    if (res.ok) {
      setStories((prev) => prev.filter((s) => s.id !== story.id));
      setTotal((t) => t - 1);
    }
    setActing(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Kelola Cerita
        </h1>
        <span className="text-sm text-muted">{total} cerita</span>
      </div>

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Cari judul cerita..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface-card border border-border rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTab(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm">
            Tidak ada cerita ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="text-left px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Cerita</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider hidden sm:table-cell">Guru</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Info</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stories.map((story) => {
                  const badge = STATUS_BADGE[story.status] ?? STATUS_BADGE.draft;
                  const isActing = acting === story.id;
                  return (
                    <tr key={story.id} className="hover:bg-surface-alt/50 transition-colors">
                      {/* Title */}
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1">{story.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {new Date(story.updated_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          {story.panel_count != null && (
                            <span className="ml-2">{story.panel_count} panel</span>
                          )}
                        </p>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[140px]">{story.author_name ?? "—"}</span>
                        </span>
                      </td>

                      {/* Meta */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {story.theme && (
                            <span className="px-1.5 py-0.5 bg-surface-alt rounded text-[10px] text-muted">{story.theme}</span>
                          )}
                          {story.level && (
                            <span className="px-1.5 py-0.5 bg-surface-alt rounded text-[10px] text-muted">{story.level}</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          {story.status === "published" && (
                            <Link href={`/stories/${story.id}`} target="_blank">
                              <Button variant="ghost" size="icon" title="Lihat cerita">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}

                          {/* Edit */}
                          <Link href={`/stories/${story.id}/edit`}>
                            <Button variant="ghost" size="icon" title="Edit cerita">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>

                          {/* Toggle publish/draft */}
                          {story.status !== "archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={story.status === "published" ? "Jadikan draft" : "Publikasikan"}
                              onClick={() => handleToggleStatus(story)}
                              disabled={isActing}
                            >
                              {isActing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : story.status === "published" ? (
                                <EyeOff className="w-4 h-4 text-warning" />
                              ) : (
                                <Eye className="w-4 h-4 text-primary" />
                              )}
                            </Button>
                          )}

                          {/* Archive (if not already archived) */}
                          {story.status !== "archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Arsipkan"
                              onClick={() => handleArchive(story)}
                              disabled={isActing}
                              className="text-muted hover:text-warning"
                            >
                              {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 13h12L19 8" />
                                </svg>
                              )}
                            </Button>
                          )}

                          {/* Restore from archive */}
                          {story.status === "archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Pulihkan ke draft"
                              onClick={() => handleToggleStatus({ ...story, status: "published" })}
                              disabled={isActing}
                              className="text-primary"
                            >
                              {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus cerita"
                            onClick={() => handleDelete(story)}
                            disabled={isActing}
                            className="text-muted hover:text-danger hover:bg-danger/10"
                          >
                            {isActing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Halaman {page} dari {totalPages} · {total} cerita
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Berikutnya
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
