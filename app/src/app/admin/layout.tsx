"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/stories", label: "Cerita", icon: BookOpen },
  { href: "/admin/posts", label: "Post", icon: FileText },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // On first load, force-refresh the session so the JWT picks up the latest role from DB
  useEffect(() => {
    if (status === "loading" || refreshed) return;
    update().then((fresh) => {
      setRefreshed(true);
      const role = (fresh?.user as any)?.role;
      if (!fresh?.user) { router.push("/login"); return; }
      if (role !== "admin") { router.push("/dashboard"); return; }
    });
  }, [status]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status === "loading" || !refreshed) {
    return <div className="min-h-screen bg-background" />;
  }

  const userName = session?.user?.name ?? "Admin";
  const userImage = session?.user?.image;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">

          {/* Logo + badge */}
          <Link href="/admin/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="relative w-7 h-7">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground hidden sm:block">
              Panel<span className="text-primary">Gambar</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-surface-alt"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-alt transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {userImage ? (
                  <img src={userImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                {userName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-[11px] text-muted truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
