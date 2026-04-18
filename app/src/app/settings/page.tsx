"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Theme, Level, TargetClass, UserProfile } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  Palette,
  BarChart3,
  GraduationCap,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Link2,
} from "lucide-react";

type TabType = "themes" | "levels" | "classes" | "social";

interface ItemForm {
  name: string;
  label: string;
  description: string;
}

const emptyForm: ItemForm = { name: "", label: "", description: "" };

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("themes");

  const [themes, setThemes] = useState<Theme[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [targetClasses, setTargetClasses] = useState<TargetClass[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  // Social connect state
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
      if (!profile || (profile.role !== "guru" && profile.role !== "admin")) {
        router.push("/dashboard");
        return;
      }
      setUser(profile as UserProfile);

      const [tRes, lRes, cRes] = await Promise.all([
        supabase.from("themes").select("*").order("sort_order"),
        supabase.from("levels").select("*").order("sort_order"),
        supabase.from("target_classes").select("*").order("sort_order"),
      ]);

      setThemes((tRes.data || []) as Theme[]);
      setLevels((lRes.data || []) as Level[]);
      setTargetClasses((cRes.data || []) as TargetClass[]);

      // Load social connect settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "google_auth_enabled")
        .single();
      if (settings) {
        setGoogleAuthEnabled(settings.value === "true");
      }

      setLoading(false);
    }
    load();
  }, []);

  function getTable() {
    return activeTab === "themes" ? "themes" : activeTab === "levels" ? "levels" : "target_classes";
  }

  function getItems() {
    return activeTab === "themes" ? themes : activeTab === "levels" ? levels : targetClasses;
  }

  function setItems(items: Theme[] | Level[] | TargetClass[]) {
    if (activeTab === "themes") setThemes(items as Theme[]);
    else if (activeTab === "levels") setLevels(items as Level[]);
    else setTargetClasses(items as TargetClass[]);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.label.trim()) return;
    setSaving(true);
    const table = getTable();
    const items = getItems();
    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (editingId) {
      const { error } = await supabase.from(table).update({
        name: slug,
        label: form.label,
        description: form.description || null,
      }).eq("id", editingId);

      if (!error) {
        setItems(items.map((item) =>
          item.id === editingId
            ? { ...item, name: slug, label: form.label, description: form.description }
            : item
        ) as typeof items);
      }
    } else {
      const { data, error } = await supabase.from(table).insert({
        name: slug,
        label: form.label,
        description: form.description || null,
        sort_order: items.length,
        is_active: true,
      }).select().single();

      if (data && !error) {
        setItems([...items, data] as typeof items);
      }
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus item ini?")) return;
    const table = getTable();
    await supabase.from(table).delete().eq("id", id);
    setItems(getItems().filter((item) => item.id !== id) as typeof themes);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const table = getTable();
    await supabase.from(table).update({ is_active: !currentActive }).eq("id", id);
    setItems(getItems().map((item) =>
      item.id === id ? { ...item, is_active: !currentActive } : item
    ) as typeof themes);
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const items = [...getItems()];
    const idx = items.findIndex((i) => i.id === id);
    if (direction === "up" && idx > 0) {
      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    } else if (direction === "down" && idx < items.length - 1) {
      [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    } else return;

    items.forEach((item, i) => (item.sort_order = i));
    setItems(items as typeof themes);

    const table = getTable();
    await Promise.all(items.map((item, i) =>
      supabase.from(table).update({ sort_order: i }).eq("id", item.id)
    ));
  }

  function startEdit(item: Theme | Level | TargetClass) {
    setEditingId(item.id);
    setForm({ name: item.name, label: item.label, description: item.description || "" });
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  async function toggleGoogleAuth() {
    setSavingSocial(true);
    const newVal = !googleAuthEnabled;
    await supabase.from("app_settings").upsert({
      key: "google_auth_enabled",
      value: String(newVal),
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
    setGoogleAuthEnabled(newVal);
    setSavingSocial(false);
  }

  const items = getItems();
  const tabLabel = activeTab === "themes" ? "Tema" : activeTab === "levels" ? "Level" : "Target Kelas";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Pengaturan</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-alt rounded-xl p-1">
          {[
            { key: "themes" as TabType, label: "Tema", icon: Palette },
            { key: "levels" as TabType, label: "Level", icon: BarChart3 },
            { key: "classes" as TabType, label: "Target Kelas", icon: GraduationCap },
            { key: "social" as TabType, label: "Social Connect", icon: Link2 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingId(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-background shadow-md"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Social Connect Tab */}
        {activeTab === "social" && (
          <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold">Social Login & Register</p>
              <p className="text-xs text-muted mt-0.5">Kelola opsi login menggunakan akun pihak ketiga</p>
            </div>

            <div className="divide-y divide-border">
              {/* Google Auth toggle */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-surface-alt rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Google Login</p>
                  <p className="text-xs text-muted">Izinkan pengguna masuk atau mendaftar menggunakan akun Google</p>
                </div>
                <button
                  onClick={toggleGoogleAuth}
                  disabled={savingSocial}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    googleAuthEnabled ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      googleAuthEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Status info */}
              <div className="px-5 py-3 bg-surface-alt/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${googleAuthEnabled ? "bg-accent" : "bg-muted"}`} />
                  <span className="text-xs text-muted">
                    {googleAuthEnabled
                      ? "Google Login aktif — pengguna dapat masuk/daftar dengan Google"
                      : "Google Login nonaktif — pengguna hanya bisa masuk dengan email & password"}
                  </span>
                </div>
                {googleAuthEnabled && (
                  <p className="text-[10px] text-muted mt-2">
                    Pastikan Google OAuth sudah dikonfigurasi di Supabase Dashboard → Authentication → Providers → Google
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items list (for themes/levels/classes tabs) */}
        {activeTab !== "social" && (
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold">{tabLabel} ({items.length})</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            >
              <Plus className="w-4 h-4" />
              Tambah
            </Button>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <div className="px-5 py-4 border-b border-border bg-surface-alt/50 space-y-3">
              <p className="text-sm font-semibold">{editingId ? "Edit" : "Tambah"} {tabLabel}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Label (tampilan)"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value, name: editingId ? form.name : e.target.value })}
                />
                <Input
                  placeholder="Deskripsi (opsional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.label.trim()} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingId ? "Update" : "Simpan"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="divide-y divide-border">
            {items.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                Belum ada {tabLabel.toLowerCase()}. Klik "Tambah" untuk menambahkan.
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-alt/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveItem(item.id, "down")}
                      disabled={idx === items.length - 1}
                      className="p-0.5 text-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <Badge variant={item.is_active ? "accent" : "outline"} className="text-[10px]">
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="px-2 py-1 text-xs rounded-lg border border-border text-muted hover:text-foreground transition-colors"
                    >
                      {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-muted hover:text-primary transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
