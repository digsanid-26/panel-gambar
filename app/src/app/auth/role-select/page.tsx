"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function RoleSelectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [role, setRole] = useState<"guru" | "siswa">("guru");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    // Pre-fill name from OAuth profile
    setName(session.user.name ?? "");
    // Check if role already set
    const userRole = (session.user as any).role;
    if (userRole && userRole !== "siswa") {
      router.push("/dashboard");
      return;
    }
    setChecking(false);
  }, [session, status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan profil.");
      setLoading(false);
      return;
    }

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
