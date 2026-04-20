"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function RoleSelectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<"guru" | "siswa">("guru");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Pre-fill name from Google profile
      const googleName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";
      setName(googleName);

      // Check if profile already exists with a role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role) {
        router.push("/dashboard");
        return;
      }

      setChecking(false);
    }
    checkUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesi tidak ditemukan. Silakan login ulang.");
      setLoading(false);
      return;
    }

    // Upsert profile with role and name
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        name: name.trim(),
        role,
        avatar_url: user.user_metadata?.avatar_url || null,
      });

    if (profileError) {
      setError("Gagal menyimpan profil: " + profileError.message);
      setLoading(false);
      return;
    }

    // Also update user metadata so it's consistent
    await supabase.auth.updateUser({
      data: { name: name.trim(), role },
    });

    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-surface-card rounded-2xl border border-border p-8 shadow-2xl shadow-primary/5">
            <div className="text-center mb-8">
              <Image src="/logo-icon.svg" alt="Logo" width={56} height={56} className="w-14 h-14 mx-auto mb-4" priority />
              <h1 className="text-2xl font-bold text-foreground">Lengkapi Profil</h1>
              <p className="text-sm text-muted mt-1">
                Pilih peran Anda untuk melanjutkan
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">
                  Saya adalah
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["guru", "siswa"] as const).map((r) => (
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
                      {r === "guru" ? "👩‍🏫 Guru" : "👦 Siswa"}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                id="name"
                label="Nama Lengkap"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !name.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Lanjutkan"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
