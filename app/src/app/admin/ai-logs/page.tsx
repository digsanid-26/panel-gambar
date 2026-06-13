"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles, Image as ImageIcon, Video, Music, BookOpen, Wand2,
  ChevronLeft, ChevronRight, RefreshCw, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  feature: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  charCount?: number;
  estimatedCostUsd?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface Summary {
  feature: string;
  _count: { id: number };
  _sum: {
    estimatedCostUsd?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    charCount?: number | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FeatureIcon = React.FC<{ className?: string }>;
const FEATURE_META: Record<string, { label: string; icon: FeatureIcon; color: string }> = {
  text:           { label: "Text",         icon: Sparkles,  color: "text-purple-500" },
  image:          { label: "Image",        icon: ImageIcon, color: "text-blue-500"   },
  video:          { label: "Video",        icon: Video,     color: "text-red-500"    },
  tts:            { label: "TTS",          icon: Music,     color: "text-green-500"  },
  "story-wizard": { label: "Story Wizard", icon: Wand2,     color: "text-amber-500"  },
  backsound:      { label: "Backsound",    icon: BookOpen,  color: "text-pink-500"   },
};

function formatCost(val?: string | null): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (n < 0.001) return `$${(n * 100).toFixed(4)}¢`;
  return `$${n.toFixed(4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterFeature, setFilterFeature] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (filterFeature) params.set("feature", filterFeature);
    if (filterUser)    params.set("user_id", filterUser);
    if (filterFrom)    params.set("date_from", filterFrom);
    if (filterTo)      params.set("date_to", filterTo);

    const res = await fetch(`/api/admin/ai-logs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setSummary(data.summary);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, filterFeature, filterUser, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const totalCost = summary.reduce((acc, s) => acc + parseFloat(s._sum.estimatedCostUsd ?? "0"), 0);
  const totalCalls = summary.reduce((acc, s) => acc + s._count.id, 0);
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Log Penggunaan AI</h1>
          <p className="text-sm text-muted mt-0.5">Riwayat generasi AI + estimasi biaya</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2 p-4 rounded-2xl border border-border bg-surface-card">
          <p className="text-xs text-muted mb-1">Total Biaya (filtered)</p>
          <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted mt-1">{totalCalls} generasi</p>
        </div>
        {Object.entries(FEATURE_META).map(([key, meta]) => {
          const s = summary.find((x) => x.feature === key);
          const Icon = meta.icon;
          return (
            <div key={key} className="p-4 rounded-2xl border border-border bg-surface-card">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span className="text-xs font-medium">{meta.label}</span>
              </div>
              <p className="text-lg font-bold">{s?._count.id ?? 0}</p>
              <p className="text-xs text-muted">{formatCost(s?._sum.estimatedCostUsd)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-2xl border border-border bg-surface-card">
        <Filter className="w-4 h-4 text-muted self-center shrink-0" />
        <Select
          className="w-36"
          value={filterFeature}
          onChange={(e) => { setFilterFeature(e.target.value); setPage(1); }}
          options={[
            { value: "", label: "Semua fitur" },
            ...Object.entries(FEATURE_META).map(([v, m]) => ({ value: v, label: m.label })),
          ]}
        />
        <Input
          className="w-48"
          placeholder="User ID..."
          value={filterUser}
          onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          className="w-36"
          value={filterFrom}
          onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          className="w-36"
          value={filterTo}
          onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
        />
        <Button
          variant="ghost" size="sm"
          onClick={() => { setFilterFeature(""); setFilterUser(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="text-left px-4 py-3 font-semibold text-muted">Waktu</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">User</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Fitur</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Model</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Token In</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Token Out</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Chars</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Est. Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Memuat...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">Belum ada log generasi AI.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = FEATURE_META[log.feature];
                  const Icon = meta?.icon ?? Sparkles;
                  return (
                    <tr key={log.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{log.user.name || log.user.email}</div>
                        <div className="text-[10px] text-muted truncate max-w-[140px]">{log.user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta?.color ?? ""}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {meta?.label ?? log.feature}
                        </span>
                        {log.metadata?.task != null && (
                          <div className="text-[10px] text-muted mt-0.5">{String(log.metadata.task as string)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{log.model ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{log.inputTokens?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{log.outputTokens?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{log.charCount?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono font-semibold">
                        {formatCost(log.estimatedCostUsd)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted">{total} total entri</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
