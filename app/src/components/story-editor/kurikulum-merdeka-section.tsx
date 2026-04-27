"use client";

import type { Story } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Trash2,
  Plus,
  Target,
  Lightbulb,
  Tag,
  ClipboardCheck,
  MessageSquare,
  BookMarked,
  Layers,
  X,
} from "lucide-react";
import { useState } from "react";

interface Props {
  story: Story;
  updateStoryField: (field: string, value: unknown) => void;
}

const ASESMEN_OPTIONS = ["Diagnostik", "Formatif", "Sumatif"];

const METODE_OPTIONS = [
  "Discovery Learning",
  "Project Based Learning (PjBL)",
  "Problem Based Learning (PBL)",
  "Inquiry Learning",
  "Cooperative Learning",
  "Direct Instruction",
  "Role Playing",
  "Demonstrasi",
  "Diskusi",
  "Ceramah",
];

export function KurikulumMerdekaSection({ story, updateStoryField }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt/40 p-4 space-y-5">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Kurikulum Merdeka
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Lengkapi komponen modul ajar sesuai Kurikulum Merdeka.
        </p>
      </div>

      {/* === KONTEN PEMBELAJARAN === */}
      <SubSection icon={<Target className="w-4 h-4" />} title="Konten Pembelajaran">
        <Textarea
          id="km-cp"
          label="Capaian Pembelajaran (CP)"
          placeholder="Tuliskan capaian pembelajaran yang ingin dicapai..."
          value={story.capaian_pembelajaran || ""}
          onChange={(e) => updateStoryField("capaian_pembelajaran", e.target.value)}
          rows={3}
        />

        <NumberedListEditor
          label="Tujuan Pembelajaran (TP)"
          values={story.tujuan_pembelajaran || []}
          placeholder="Tujuan pembelajaran"
          addLabel="Tambah Tujuan"
          onChange={(arr) => updateStoryField("tujuan_pembelajaran", arr)}
        />

        <Textarea
          id="km-materi-pokok"
          label="Materi Pokok"
          placeholder="Pokok-pokok materi yang dibahas dalam cerita ini..."
          value={story.materi_pokok || ""}
          onChange={(e) => updateStoryField("materi_pokok", e.target.value)}
          rows={3}
        />
      </SubSection>

      {/* === STRATEGI PEMBELAJARAN === */}
      <SubSection icon={<Layers className="w-4 h-4" />} title="Strategi Pembelajaran">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="km-metode"
            label="Metode / Model Pembelajaran"
            value={story.metode_pembelajaran || ""}
            onChange={(e) => updateStoryField("metode_pembelajaran", e.target.value)}
            options={[
              { value: "", label: "-- Pilih --" },
              ...METODE_OPTIONS.map((m) => ({ value: m, label: m })),
            ]}
          />
          <Input
            id="km-alokasi-waktu"
            label="Alokasi Waktu"
            placeholder="Misal: 2 JP × 35 menit"
            value={story.alokasi_waktu || ""}
            onChange={(e) => updateStoryField("alokasi_waktu", e.target.value)}
          />
        </div>
        <Textarea
          id="km-pendekatan"
          label="Pendekatan Pembelajaran"
          placeholder="Misal: saintifik, kontekstual, TPACK, dll..."
          value={story.pendekatan_pembelajaran || ""}
          onChange={(e) => updateStoryField("pendekatan_pembelajaran", e.target.value)}
          rows={2}
        />
      </SubSection>

      {/* === AKTIVITAS === */}
      <SubSection icon={<Lightbulb className="w-4 h-4" />} title="Aktivitas Pembelajaran">
        <NumberedListEditor
          label="Pertanyaan Pemantik"
          values={story.pertanyaan_pemantik || []}
          placeholder="Pertanyaan pembuka diskusi"
          addLabel="Tambah Pertanyaan"
          onChange={(arr) => updateStoryField("pertanyaan_pemantik", arr)}
        />

        <TagListEditor
          label="Kata Kunci"
          values={story.kata_kunci || []}
          placeholder="Ketik kata kunci & tekan Enter..."
          onChange={(arr) => updateStoryField("kata_kunci", arr)}
        />
      </SubSection>

      {/* === ASESMEN & EVALUASI === */}
      <SubSection icon={<ClipboardCheck className="w-4 h-4" />} title="Asesmen & Evaluasi">
        <div>
          <label className="block text-sm font-semibold mb-2">Jenis Asesmen</label>
          <div className="flex flex-wrap gap-2">
            {ASESMEN_OPTIONS.map((opt) => {
              const active = (story.asesmen_jenis || []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const cur = story.asesmen_jenis || [];
                    const next = active ? cur.filter((x) => x !== opt) : [...cur, opt];
                    updateStoryField("asesmen_jenis", next);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          id="km-asesmen-deskripsi"
          label="Deskripsi Asesmen"
          placeholder="Jelaskan instrumen, kriteria, atau bentuk asesmen yang digunakan..."
          value={story.asesmen_deskripsi || ""}
          onChange={(e) => updateStoryField("asesmen_deskripsi", e.target.value)}
          rows={3}
        />

        <Textarea
          id="km-evaluasi-guru"
          label="Evaluasi Guru (Rangkuman Proses Belajar)"
          placeholder="Rangkuman / catatan guru terhadap proses belajar mengajar siswa dalam mengikuti materi..."
          value={story.evaluasi_guru || ""}
          onChange={(e) => updateStoryField("evaluasi_guru", e.target.value)}
          rows={4}
        />

        <Input
          id="km-link-quiz"
          label="Link Quiz / Pelatihan"
          type="url"
          placeholder="https://forms.google.com/... atau https://quizizz.com/..."
          value={story.link_quiz || ""}
          onChange={(e) => updateStoryField("link_quiz", e.target.value)}
        />
      </SubSection>

      {/* === REFLEKSI === */}
      <SubSection icon={<MessageSquare className="w-4 h-4" />} title="Refleksi">
        <NumberedListEditor
          label="Refleksi Siswa"
          values={story.refleksi_siswa || []}
          placeholder="Pertanyaan refleksi untuk siswa"
          addLabel="Tambah Pertanyaan"
          onChange={(arr) => updateStoryField("refleksi_siswa", arr)}
        />

        <NumberedListEditor
          label="Refleksi Guru"
          values={story.refleksi_guru || []}
          placeholder="Pertanyaan refleksi untuk guru"
          addLabel="Tambah Pertanyaan"
          onChange={(arr) => updateStoryField("refleksi_guru", arr)}
        />
      </SubSection>

      {/* === REFERENSI === */}
      <SubSection icon={<BookMarked className="w-4 h-4" />} title="Referensi">
        <ObjectListEditor
          label="Sumber Belajar Tambahan"
          values={story.sumber_belajar || []}
          fields={[
            { key: "judul", placeholder: "Judul sumber" },
            { key: "url", placeholder: "https://..." },
          ]}
          addLabel="Tambah Sumber"
          onChange={(arr) => updateStoryField("sumber_belajar", arr)}
        />

        <ObjectListEditor
          label="Glosarium"
          values={story.glosarium || []}
          fields={[
            { key: "istilah", placeholder: "Istilah" },
            { key: "definisi", placeholder: "Definisi singkat" },
          ]}
          addLabel="Tambah Istilah"
          onChange={(arr) => updateStoryField("glosarium", arr)}
        />
      </SubSection>
    </div>
  );
}

/* ---------- helpers ---------- */

function SubSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-border first:pt-0 first:border-t-0">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function NumberedListEditor({
  label,
  values,
  placeholder,
  addLabel,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  addLabel: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="space-y-2">
        {values.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="shrink-0 w-7 h-9 flex items-center justify-center text-sm font-semibold text-muted bg-surface rounded-lg border border-border">
              {idx + 1}.
            </span>
            <Input
              value={item}
              placeholder={`${placeholder} ${idx + 1}...`}
              onChange={(e) => {
                const arr = [...values];
                arr[idx] = e.target.value;
                onChange(arr);
              }}
            />
            <button
              type="button"
              onClick={() => {
                const arr = [...values];
                arr.splice(idx, 1);
                onChange(arr);
              }}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
              title="Hapus"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" type="button" onClick={() => onChange([...values, ""])}>
          <Plus className="w-4 h-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function TagListEditor({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const t = draft.trim();
    if (!t) return;
    if (values.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...values, t]);
    setDraft("");
  }

  return (
    <div>
      <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
        <Tag className="w-4 h-4 text-muted" />
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                const arr = [...values];
                arr.splice(idx, 1);
                onChange(arr);
              }}
              className="hover:text-danger"
              title="Hapus"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <Button variant="outline" size="sm" type="button" onClick={addTag}>
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>
    </div>
  );
}

function ObjectListEditor<T extends Record<string, string>>({
  label,
  values,
  fields,
  addLabel,
  onChange,
}: {
  label: string;
  values: T[];
  fields: { key: keyof T & string; placeholder: string }[];
  addLabel: string;
  onChange: (next: T[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="space-y-2">
        {values.map((row, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 rounded-lg border border-border bg-surface"
          >
            <span className="shrink-0 w-7 h-9 flex items-center justify-center text-sm font-semibold text-muted">
              {idx + 1}.
            </span>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fields.map((f) => (
                <Input
                  key={f.key}
                  value={row[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    const arr = [...values];
                    arr[idx] = { ...arr[idx], [f.key]: e.target.value } as T;
                    onChange(arr);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const arr = [...values];
                arr.splice(idx, 1);
                onChange(arr);
              }}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
              title="Hapus"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            const empty = Object.fromEntries(fields.map((f) => [f.key, ""])) as T;
            onChange([...values, empty]);
          }}
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
