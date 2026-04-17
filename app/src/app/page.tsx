"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/navbar";
import {
  BookOpen,
  Mic,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  Volume2,
  Sparkles,
  ChevronRight,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", { opacity: 0, y: 20, duration: 0.6, delay: 0.2 });
      gsap.from(".hero-title", { opacity: 0, y: 30, duration: 0.8, delay: 0.4 });
      gsap.from(".hero-desc", { opacity: 0, y: 20, duration: 0.6, delay: 0.7 });
      gsap.from(".hero-buttons", { opacity: 0, y: 20, duration: 0.6, delay: 0.9 });
      gsap.from(".hero-preview", { opacity: 0, scale: 0.95, duration: 0.8, delay: 1.1 });
      gsap.from(".hero-shape", {
        opacity: 0,
        scale: 0,
        duration: 1,
        delay: 0.5,
        stagger: 0.15,
        ease: "back.out(1.7)",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.3,
        ease: "power2.out",
      });
    }, featuresRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Background gradient shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hero-shape absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="hero-shape absolute top-1/4 -right-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
          <div className="hero-shape absolute bottom-0 left-1/3 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-semibold text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              Media Pembelajaran Interaktif SD
            </div>
            <h1 className="hero-title text-4xl sm:text-5xl lg:text-7xl font-black text-foreground leading-tight tracking-tight">
              PANEL GAMBAR{" "}
              <span className="text-primary relative">
                BERSUARA
                <span className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/40 rounded-full" />
              </span>
            </h1>
            <p className="hero-desc mt-6 text-lg sm:text-xl text-muted leading-relaxed max-w-2xl mx-auto">
              Bangun kecintaan membaca dan menyuarakan Bahasa Indonesia
              melalui cerita bergambar interaktif untuk siswa Sekolah Dasar.
            </p>
            <div className="hero-buttons mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" variant="primary" className="group">
                  Mulai Sekarang
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/stories">
                <Button size="lg" variant="outline" className="group">
                  <Play className="w-4 h-4" />
                  Lihat Cerita
                </Button>
              </Link>
            </div>
          </div>

          {/* Preview illustration */}
          <div className="hero-preview mt-16 max-w-4xl mx-auto">
            <div className="bg-surface-card rounded-2xl border border-border p-6 sm:p-8 shadow-2xl shadow-primary/5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { bg: "bg-primary/5", border: "border-primary/20", color: "text-primary" },
                  { bg: "bg-secondary/5", border: "border-secondary/20", color: "text-secondary" },
                  { bg: "bg-accent/5", border: "border-accent/20", color: "text-accent" },
                ].map((panel, i) => (
                  <div
                    key={i}
                    className={`${panel.bg} ${panel.border} border rounded-xl p-4 aspect-square flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-300`}
                  >
                    <ImageIcon className={`w-8 h-8 ${panel.color}`} />
                    <div className="bg-surface-alt rounded-lg px-3 py-1.5 border border-border text-xs font-medium text-center text-foreground">
                      &ldquo;Halo, aku Kelinci!&rdquo;
                    </div>
                    <div className="flex gap-1 mt-1">
                      <span className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Volume2 className="w-3 h-3 text-secondary" />
                      </span>
                      <span className="w-6 h-6 rounded-full bg-danger/20 flex items-center justify-center">
                        <Mic className="w-3 h-3 text-danger" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted mt-4">
                Contoh tampilan panel cerita dengan dialog dan fitur audio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">Fitur Unggulan</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">
              Semua yang Dibutuhkan
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: ImageIcon,
                color: "text-primary",
                glow: "group-hover:shadow-primary/20",
                title: "Panel Cerita Visual",
                desc: "Rangkaian gambar yang membentuk cerita menarik dengan kotak dialog dan narasi.",
              },
              {
                icon: Volume2,
                color: "text-secondary",
                glow: "group-hover:shadow-secondary/20",
                title: "Audio Interaktif",
                desc: "Dengarkan narasi guru, suara latar, dan dialog karakter yang menghidupkan cerita.",
              },
              {
                icon: Mic,
                color: "text-danger",
                glow: "group-hover:shadow-danger/20",
                title: "Rekam Suara",
                desc: "Siswa dapat merekam suara mereka membaca dialog dan narasi untuk berlatih.",
              },
              {
                icon: Users,
                color: "text-accent",
                glow: "group-hover:shadow-accent/20",
                title: "Authoring Tool Guru",
                desc: "Guru dapat membuat panel cerita sendiri dengan mudah tanpa keahlian teknis.",
              },
              {
                icon: Monitor,
                color: "text-purple-400",
                glow: "group-hover:shadow-purple-400/20",
                title: "Lintas Perangkat",
                desc: "Berjalan di smartphone, tablet, laptop, PC, hingga Interactive Flat Panel.",
              },
              {
                icon: Sparkles,
                color: "text-pink-400",
                glow: "group-hover:shadow-pink-400/20",
                title: "Gamifikasi",
                desc: "Badge, bintang, dan feedback dari guru untuk memotivasi siswa membaca.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className={`feature-card group p-6 rounded-2xl bg-surface-card border border-border hover:border-border-light transition-all duration-300 hover:shadow-xl ${f.glow}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center mb-4`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Devices */}
      <section className="py-16 bg-surface-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Cross-Platform</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-3 mb-10">
            Satu Aplikasi, Semua Perangkat
          </h2>
          <div className="flex items-center justify-center gap-8 sm:gap-14">
            {[
              { icon: Smartphone, label: "Smartphone" },
              { icon: Tablet, label: "Tablet" },
              { icon: Monitor, label: "Laptop / PC" },
              { icon: Monitor, label: "Smartboard" },
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-card border border-border flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                  <d.icon className="w-7 h-7 sm:w-9 sm:h-9 text-muted group-hover:text-primary transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted group-hover:text-foreground transition-colors">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
            Siap Memulai?
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Daftar sekarang dan mulai buat panel cerita interaktif untuk siswa Anda.
          </p>
          <Link href="/register">
            <Button size="lg" variant="primary" className="text-lg px-10 py-4">
              Daftar Gratis
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted">
          <p>&copy; 2026 Panel Gambar Bersuara. Hak cipta dilindungi.</p>
          <p className="mt-1">
            Media Pembelajaran Interaktif untuk Sekolah Dasar
          </p>
        </div>
      </footer>
    </div>
  );
}
