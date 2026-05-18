"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, MapPin, GraduationCap, User, Loader2, Eye } from "lucide-react";

interface TeacherProfile {
  id: string; name: string; avatar_url?: string; bio?: string;
  subjects: string[]; location?: string; school?: string;
  story_count: number; created_at: string;
  stories?: { id: string; title: string; cover_image_url?: string; theme: string; level: string; panel_count?: number }[];
}

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teachers/${teacherId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setTeacher(data); setLoading(false); })
      .catch(() => { router.push("/stories"); });
  }, [teacherId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>
    </div>
  );
  if (!teacher) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
        </div>

        {/* Profile card */}
        <div className="bg-surface-card border border-border rounded-2xl p-6 mb-8 flex flex-col sm:flex-row gap-6 items-start">
          {teacher.avatar_url ? (
            <img src={teacher.avatar_url} alt={teacher.name} className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-4 border-border" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border-4 border-border">
              <User className="w-10 h-10 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{teacher.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted mb-3">
              {teacher.school && (
                <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{teacher.school}</span>
              )}
              {teacher.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{teacher.location}</span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />{teacher.story_count} cerita dipublikasi
              </span>
            </div>
            {teacher.bio && <p className="text-sm text-muted leading-relaxed mb-3">{teacher.bio}</p>}
            {teacher.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {teacher.subjects.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stories */}
        <div>
          <h2 className="text-xl font-bold mb-4">Cerita yang Dipublikasikan</h2>
          {(!teacher.stories || teacher.stories.length === 0) ? (
            <div className="text-center py-12 text-muted">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Belum ada cerita yang dipublikasikan.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacher.stories.map((story) => (
                <Link key={story.id} href={`/stories/${story.id}`} className="group bg-surface-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
                  <div className="aspect-video bg-surface-alt overflow-hidden">
                    {story.cover_image_url ? (
                      <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">{story.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{story.theme} · {story.level}</span>
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> Baca</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
