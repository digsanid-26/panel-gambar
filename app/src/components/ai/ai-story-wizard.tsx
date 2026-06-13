"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, X, ChevronRight, ChevronLeft,
  Check, BookOpen, Users, LayoutGrid, Wand2,
} from "lucide-react";
import type { WizardDraft, WizardCharacter, WizardPanel } from "@/app/api/ai/story-wizard/route";

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Input form options
// ────────────────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: "dasar", label: "Dasar (Kelas 1-3)" },
  { value: "menengah", label: "Menengah (Kelas 4-6)" },
];

const CLASS_OPTIONS = [
  "Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6",
  "Kelas 1-2", "Kelas 2-3", "Kelas 4-5", "Kelas 5-6",
];

const MAPEL_OPTIONS = [
  "Bahasa Indonesia", "Matematika", "IPA", "IPS", "PPKn",
  "IPAS", "Seni Budaya", "PJOK", "Bahasa Inggris", "Agama",
];

const TOPIC_SUGGESTIONS = [
  "Persahabatan dan tolong-menolong",
  "Menjaga kebersihan lingkungan",
  "Kejujuran dalam kehidupan sehari-hari",
  "Keberagaman budaya Indonesia",
  "Mengenal profesi dan cita-cita",
  "Hemat energi dan air",
  "Belajar dengan giat dan tekun",
  "Menghormati orang yang lebih tua",
];

// ────────────────────────────────────────────────────────────────────────────

interface AiStoryWizardProps {
  trigger?: React.ReactNode;
}

type Step = "input" | "generating" | "preview" | "saving";

export function AiStoryWizard({ trigger }: AiStoryWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");

  // Step 1 form
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("dasar");
  const [targetClass, setTargetClass] = useState("Kelas 1-2");
  const [mataPelajaran, setMataPelajaran] = useState("Bahasa Indonesia");
  const [panelCount, setPanelCount] = useState(5);

  // Results
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("input");
    setDraft(null);
    setError(null);
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/ai/story-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, target_class: targetClass, mata_pelajaran: mataPelajaran, panel_count: panelCount }),
      });
      if (!res.ok) {
        const { error: e } = await res.json().catch(() => ({ error: "Gagal generate cerita" }));
        setError(e || "Gagal generate cerita");
        setStep("input");
        return;
      }
      const { draft: d } = await res.json();
      setDraft(d);
      setStep("preview");
    } catch {
      setError("Terjadi kesalahan jaringan");
      setStep("input");
    }
  }

  async function handleCreate() {
    if (!draft) return;
    setStep("saving");

    try {
      // 1. Create story
      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          theme: draft.theme ?? "umum",
          level,
          target_class: targetClass,
          kurikulum: "merdeka",
          mata_pelajaran: mataPelajaran,
          status: "draft",
          characters: draft.characters?.map((c) => ({
            id: c.id,
            name: c.name,
            gender: c.gender,
            color: c.color,
            description: c.description,
          })),
        }),
      });
      if (!storyRes.ok) throw new Error("Gagal membuat cerita");
      const story = await storyRes.json();
      const storyId = story.id;

      // 2. Update kurikulum fields
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capaian_pembelajaran: draft.cp,
          tujuan_pembelajaran: draft.tujuan_pembelajaran ?? [],
          pertanyaan_pemantik: draft.pertanyaan_pemantik ?? [],
          kata_kunci: draft.kata_kunci ?? [],
        }),
      });

      // 3. Create panels + dialogs sequentially
      for (let i = 0; i < (draft.panels ?? []).length; i++) {
        const p: WizardPanel = draft.panels[i];
        const panelRes = await fetch("/api/panels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            story_id: storyId,
            order_index: i,
            panel_type: "simple",
            narration_text: p.narration_text,
          }),
        });
        if (!panelRes.ok) continue;
        const panel = await panelRes.json();

        if (p.dialogs && p.dialogs.length > 0) {
          for (let j = 0; j < p.dialogs.length; j++) {
            const d = p.dialogs[j];
            await fetch("/api/dialogs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                panel_id: panel.id,
                order_index: j,
                character_name: d.character_name,
                text: d.text,
                position_x: d.position_x ?? 50,
                position_y: d.position_y ?? 80,
              }),
            });
          }
        }
      }

      setOpen(false);
      reset();
      router.push(`/stories/${storyId}/edit`);
    } catch {
      setError("Gagal menyimpan cerita. Silakan coba lagi.");
      setStep("preview");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger */}
      <div onClick={() => { setOpen(true); reset(); }}>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-secondary to-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Wand2 className="w-4 h-4" />
            Buat Cerita dengan AI Wizard
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (step !== "saving") { setOpen(false); reset(); } }} />

          <div className="relative bg-surface-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-surface-card border-b border-border rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">AI Story Wizard</h2>
                  <p className="text-xs text-muted">
                    {step === "input" ? "Langkah 1: Isi detail cerita" :
                     step === "generating" ? "Sedang membuat draft..." :
                     step === "preview" ? "Langkah 2: Review draft cerita" :
                     "Menyimpan cerita..."}
                  </p>
                </div>
              </div>
              {step !== "saving" && step !== "generating" && (
                <button onClick={() => { setOpen(false); reset(); }} className="text-muted hover:text-foreground rounded-lg p-1">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6">

              {/* ── STEP: INPUT ────────────────────────────────────────────── */}
              {step === "input" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Topik Cerita <span className="text-danger">*</span></label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Deskripsikan topik atau pesan moral yang ingin disampaikan..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    {/* Suggestions */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {TOPIC_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTopic(s)}
                          className="text-xs px-2 py-1 rounded-full border border-border text-muted hover:border-secondary hover:text-secondary transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tingkat</label>
                      <select value={level} onChange={(e) => setLevel(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                        {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Target Kelas</label>
                      <select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                        {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                      <select value={mataPelajaran} onChange={(e) => setMataPelajaran(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-surface px-2 text-sm">
                        {MAPEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jumlah Panel</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range" min={3} max={7} value={panelCount}
                          onChange={(e) => setPanelCount(Number(e.target.value))}
                          className="flex-1 accent-secondary"
                        />
                        <span className="text-sm font-bold text-secondary w-6 text-center">{panelCount}</span>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!topic.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Cerita
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP: GENERATING ────────────────────────────────────────── */}
              {step === "generating" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">Membuat Draft Cerita...</p>
                    <p className="text-sm text-muted mt-1">AI sedang merancang karakter, narasi, dan dialog panel</p>
                    <p className="text-xs text-muted mt-3">Biasanya membutuhkan 15–30 detik</p>
                  </div>
                  <div className="flex gap-6 text-xs text-muted mt-4">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Karakter</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Kurikulum</span>
                    <span className="flex items-center gap-1"><LayoutGrid className="w-3.5 h-3.5" /> {panelCount} Panel</span>
                  </div>
                </div>
              )}

              {/* ── STEP: PREVIEW ────────────────────────────────────────────── */}
              {step === "preview" && draft && (
                <div className="space-y-5">
                  {/* Title & description */}
                  <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-foreground">{draft.title}</h3>
                    <p className="text-sm text-muted mt-1">{draft.description}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">{draft.theme}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">{mataPelajaran}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted">{targetClass}</span>
                    </div>
                  </div>

                  {/* Characters */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                      <Users className="w-4 h-4 text-secondary" /> Karakter ({draft.characters?.length ?? 0})
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {draft.characters?.map((c: WizardCharacter & { id?: string }) => (
                        <div key={c.name} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                          <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <div>
                            <p className="text-xs font-semibold">{c.name}</p>
                            <p className="text-[10px] text-muted">{c.gender === "male" ? "Laki-laki" : c.gender === "female" ? "Perempuan" : "Lainnya"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CP & TP */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-4 h-4 text-secondary" /> Kurikulum Merdeka
                    </h4>
                    <div className="rounded-xl border border-border bg-surface p-3 space-y-2 text-xs">
                      <div>
                        <span className="font-semibold text-muted uppercase tracking-wide text-[10px]">CP</span>
                        <p className="text-foreground mt-0.5">{draft.cp}</p>
                      </div>
                      {draft.tujuan_pembelajaran?.length > 0 && (
                        <div>
                          <span className="font-semibold text-muted uppercase tracking-wide text-[10px]">Tujuan Pembelajaran</span>
                          <ul className="mt-0.5 space-y-0.5">
                            {draft.tujuan_pembelajaran.map((tp, i) => (
                              <li key={i} className="text-foreground">{tp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {draft.kata_kunci?.length > 0 && (
                        <div>
                          <span className="font-semibold text-muted uppercase tracking-wide text-[10px]">Kata Kunci</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {draft.kata_kunci.map((k) => (
                              <span key={k} className="px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[10px]">{k}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panels preview */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                      <LayoutGrid className="w-4 h-4 text-secondary" /> Panel ({draft.panels?.length ?? 0})
                    </h4>
                    <div className="space-y-2">
                      {draft.panels?.map((p: WizardPanel & { id?: string }, i: number) => (
                        <div key={i} className="rounded-xl border border-border bg-surface p-3">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-secondary/20 text-secondary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground leading-relaxed">{p.narration_text}</p>
                              {p.dialogs?.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  {p.dialogs.map((d, j) => (
                                    <div key={j} className="flex items-start gap-1.5">
                                      <div
                                        className="w-2 h-2 rounded-full shrink-0 mt-1"
                                        style={{ backgroundColor: draft.characters?.find((c) => c.name === d.character_name)?.color ?? "#ccc" }}
                                      />
                                      <p className="text-[10px] text-muted">
                                        <span className="font-semibold text-foreground">{d.character_name}:</span> {d.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("input")}
                      className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-border text-foreground hover:bg-surface transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Ubah Input
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-secondary text-secondary hover:bg-secondary/5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Ulang
                      </button>
                      <button
                        type="button"
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-secondary to-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        <Check className="w-4 h-4" />
                        Buat Cerita Ini
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP: SAVING ─────────────────────────────────────────────── */}
              {step === "saving" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-foreground">Menyimpan Cerita...</p>
                    <p className="text-sm text-muted mt-1">Membuat panel dan dialog, sebentar lagi...</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
