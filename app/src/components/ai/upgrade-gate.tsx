"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface UpgradeGateProps {
  feature?: string;
  compact?: boolean;
}

export function UpgradeGate({ feature = "Creator-AI", compact = false }: UpgradeGateProps) {
  if (compact) {
    return (
      <Link
        href="/creator-ai"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Upgrade untuk {feature}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-3">
      <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Fitur {feature}</p>
        <p className="text-xs text-muted mt-0.5">
          Generate gambar, teks, dan video langsung dari editor cerita.
          Tersedia untuk akun Creator-AI.
        </p>
        <Link
          href="/creator-ai"
          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline"
        >
          Pelajari & Upgrade →
        </Link>
      </div>
    </div>
  );
}
