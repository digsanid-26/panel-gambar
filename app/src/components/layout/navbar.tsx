"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Building2,
  ChevronDown,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  PlusCircle,
  Radio,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storiesDropdownOpen, setStoriesDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [mobileStoriesOpen, setMobileStoriesOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const storiesDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
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

  // Close desktop dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (storiesDropdownRef.current && !storiesDropdownRef.current.contains(e.target as Node)) {
        setStoriesDropdownOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const isGuru = user?.role === "guru" || user?.role === "admin";
  const isStoriesActive =
    pathname === "/stories" ||
    pathname.startsWith("/stories/") ||
    pathname === "/live" ||
    pathname.startsWith("/live/") ||
    pathname === "/ar" ||
    pathname.startsWith("/ar/");
  const isSettingsActive =
    pathname === "/school" ||
    pathname.startsWith("/school/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  // Simple nav links (no dropdown items)
  const navLinks = user
    ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
    : [];

  // Stories sub-menu items
  const storiesSubLinks = user
    ? [
        { href: "/stories", label: "Daftar Cerita", icon: List },
        { href: "/live", label: "Sesi Live", icon: Radio },
        { href: "/ar", label: "Panel AR", icon: Sparkles },
        ...(isGuru
          ? [{ href: "/stories/create", label: "Buat Cerita", icon: PlusCircle }]
          : []),
      ]
    : [
        { href: "/ar", label: "Panel AR", icon: Sparkles },
      ];

  // Settings sub-menu items (guru only)
  const settingsSubLinks = isGuru
    ? [
        { href: "/school", label: "Sekolah", icon: Building2 },
        { href: "/settings", label: "Pengaturan", icon: Settings },
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo-icon.svg" alt="Logo" width={36} height={36} className="w-9 h-9" priority />
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

            {/* Cerita dropdown (desktop) */}
            {storiesSubLinks.length > 0 && (
              <div className="relative" ref={storiesDropdownRef}>
                <button
                  onClick={() => setStoriesDropdownOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isStoriesActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted hover:text-foreground hover:bg-surface-alt"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  Cerita
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", storiesDropdownOpen && "rotate-180")} />
                </button>

                {storiesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] z-50">
                    {storiesSubLinks.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setStoriesDropdownOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                          pathname === sub.href
                            ? "bg-primary/10 text-primary"
                            : "text-muted hover:text-foreground hover:bg-surface-alt"
                        )}
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pengaturan dropdown (desktop) */}
            {settingsSubLinks.length > 0 && (
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  onClick={() => setSettingsDropdownOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isSettingsActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted hover:text-foreground hover:bg-surface-alt"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Pengaturan
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", settingsDropdownOpen && "rotate-180")} />
                </button>

                {settingsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] z-50">
                    {settingsSubLinks.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSettingsDropdownOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                          pathname === sub.href
                            ? "bg-primary/10 text-primary"
                            : "text-muted hover:text-foreground hover:bg-surface-alt"
                        )}
                      >
                        <sub.icon className="w-4 h-4" />
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
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

          {/* Cerita collapsible group (mobile) */}
          {user && storiesSubLinks.length > 0 && (
            <div>
              <button
                onClick={() => setMobileStoriesOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
                  isStoriesActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface-alt"
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1 text-left">Cerita</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mobileStoriesOpen && "rotate-180")} />
              </button>
              {mobileStoriesOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                  {storiesSubLinks.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => { setMobileOpen(false); setMobileStoriesOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === sub.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:text-foreground hover:bg-surface-alt"
                      )}
                    >
                      <sub.icon className="w-4 h-4" />
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pengaturan collapsible group (mobile) */}
          {settingsSubLinks.length > 0 && (
            <div>
              <button
                onClick={() => setMobileSettingsOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
                  isSettingsActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface-alt"
                )}
              >
                <Settings className="w-4 h-4" />
                <span className="flex-1 text-left">Pengaturan</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mobileSettingsOpen && "rotate-180")} />
              </button>
              {mobileSettingsOpen && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                  {settingsSubLinks.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => { setMobileOpen(false); setMobileSettingsOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === sub.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:text-foreground hover:bg-surface-alt"
                      )}
                    >
                      <sub.icon className="w-4 h-4" />
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

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
