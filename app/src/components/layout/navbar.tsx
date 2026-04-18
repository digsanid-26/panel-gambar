"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Radio,
  Settings,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (profile) setUser(profile as UserProfile);
      }
    }
    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/stories", label: "Cerita", icon: BookOpen },
        { href: "/live", label: "Sesi Live", icon: Radio },
        ...(user.role === "guru" || user.role === "admin"
          ? [
              { href: "/stories/create", label: "Buat Cerita", icon: PlusCircle },
              { href: "/school", label: "Sekolah", icon: Building2 },
              { href: "/settings", label: "Pengaturan", icon: Settings },
            ]
          : []),
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen className="w-5 h-5 text-background" />
            </div>
            <span className="font-bold text-lg hidden sm:block text-foreground">
              Panel Gambar <span className="text-primary">Bersuara</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface-alt"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt border border-border rounded-xl">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{user.name}</span>
                  <span className="text-xs text-muted capitalize">
                    ({user.role})
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Daftar
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground hover:bg-surface-alt"
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted">
                <User className="w-4 h-4 text-primary" />
                {user.name} ({user.role})
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 w-full"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Masuk
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  Daftar
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
