"use client";

import type { Story, StoryCharacter } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Film,
  GraduationCap,
  Layers,
  Play,
  School,
  User,
} from "lucide-react";

interface StoryCoverPageProps {
  story: Story;
  onPlay: () => void;
  onShowTrailer?: () => void;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="text-primary mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-muted text-xs">{label}</span>
        <p className="font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

export function StoryCoverPage({ story, onPlay, onShowTrailer }: StoryCoverPageProps) {
  const characters = (story.characters || []) as StoryCharacter[];

  // Collect metadata rows
  const infoItems: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (story.kurikulum) {
    infoItems.push({ icon: <GraduationCap className="w-4 h-4" />, label: "Kurikulum", value: story.kurikulum });
  }
  if (story.mata_pelajaran) {
    infoItems.push({ icon: <BookOpen className="w-4 h-4" />, label: "Mata Pelajaran", value: story.mata_pelajaran });
  }
  if (story.target_class) {
    infoItems.push({ icon: <School className="w-4 h-4" />, label: "Kelas", value: story.target_class });
  }
  if (story.semester) {
    infoItems.push({ icon: <Layers className="w-4 h-4" />, label: "Semester", value: story.semester });
  }
  if (story.sumber_cerita) {
    const srcText = story.detail_sumber
      ? `${story.sumber_cerita} — ${story.detail_sumber}`
      : story.sumber_cerita;
    infoItems.push({ icon: <BookOpen className="w-4 h-4" />, label: "Sumber Cerita", value: srcText });
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-surface-card rounded-2xl border border-border overflow-hidden shadow-lg">
        {/* Cover image */}
        {story.cover_image_url ? (
          <div className="relative w-full aspect-[16/9] bg-black">
            <img
              src={story.cover_image_url}
              alt={story.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

            {/* Title overlay on image */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-lg">
                {story.title}
              </h1>
              {story.author_name && (
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {story.author_name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <div className="text-center p-6">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                {story.title}
              </h1>
              {story.author_name && (
                <p className="text-muted text-sm mt-2 flex items-center gap-1.5 justify-center">
                  <User className="w-3.5 h-3.5" />
                  {story.author_name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info section below cover */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            {story.theme && (
              <Badge variant="secondary" className="text-xs">{story.theme}</Badge>
            )}
            {story.level && (
              <Badge variant="outline" className="text-xs capitalize">{story.level}</Badge>
            )}
            {story.target_class && (
              <Badge variant="outline" className="text-xs">{story.target_class}</Badge>
            )}
          </div>

          {/* Description */}
          {story.description && (
            <p className="text-sm text-muted leading-relaxed">{story.description}</p>
          )}

          {/* Metadata grid */}
          {infoItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              {infoItems.map((item, i) => (
                <InfoRow key={i} icon={item.icon} label={item.label} value={item.value} />
              ))}
            </div>
          )}

          {/* Additional info */}
          {story.informasi_tambahan && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted mb-1">Informasi Tambahan</p>
              <p className="text-sm leading-relaxed">{story.informasi_tambahan}</p>
            </div>
          )}

          {/* Characters preview */}
          {characters.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted mb-2">Karakter</p>
              <div className="flex flex-wrap gap-2">
                {characters.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface text-xs"
                  >
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.name.charAt(0)}
                      </span>
                    )}
                    <span className="font-medium" style={{ color: c.color }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3">
            <Button variant="primary" onClick={onPlay} className="flex-1 sm:flex-none">
              <Play className="w-5 h-5" />
              Mulai Membaca
            </Button>
            {story.video_trailer_url && onShowTrailer && (
              <Button variant="outline" onClick={onShowTrailer}>
                <Film className="w-4 h-4" />
                Tonton Trailer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
