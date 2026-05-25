"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, School, Plus, MapPin } from "lucide-react";
import type { RegionValue } from "./region-cascade";

export interface SchoolRecord {
  id: string;
  name: string;
  address: string;
  kelurahan: string | null;
  kecamatan: string | null;
  city: string | null;
  province: string | null;
  provinsiCode: string | null;
  kabupatenCode: string | null;
  kecamatanCode: string | null;
  kelurahanCode: string | null;
  phone: string | null;
  teacherId: string;
}

interface SchoolSearchProps {
  value: string;
  selectedId?: string;
  region?: Partial<RegionValue>;
  onChange: (name: string) => void;
  onSelect: (school: SchoolRecord | null) => void;
  disabled?: boolean;
}

export function SchoolSearch({ value, selectedId, region, onChange, onSelect, disabled }: SchoolSearchProps) {
  const [suggestions, setSuggestions] = useState<SchoolRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function search(keyword: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!keyword.trim()) { setSuggestions([]); return; }

    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({ search: keyword, limit: "8" });
      if (region?.kecamatan) params.set("kecamatan", region.kecamatan);
      else if (region?.kabupaten) params.set("city", region.kabupaten);
      else if (region?.provinsi) params.set("province", region.provinsi);

      const res = await fetch(`/api/schools?${params}`);
      const data: SchoolRecord[] = await res.json();
      setSuggestions(data);
      setSearching(false);
      setOpen(true);
    }, 300);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (selectedId) onSelect(null); // clear selection when user types new text
    search(v);
  }

  function handleSelect(school: SchoolRecord) {
    onChange(school.name);
    onSelect(school);
    setSuggestions([]);
    setOpen(false);
  }

  function handleUseNew() {
    onSelect(null);
    setSuggestions([]);
    setOpen(false);
  }

  const showNewOption = value.trim().length >= 2 && !suggestions.some(
    (s) => s.name.toLowerCase() === value.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Nama Sekolah
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length > 0 || value.trim()) setOpen(true); }}
          disabled={disabled}
          placeholder="Ketik nama sekolah untuk mencari atau membuat baru..."
          className="w-full px-3 py-2.5 pr-9 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
        </div>
      </div>

      {/* Selected indicator */}
      {selectedId && (
        <p className="text-xs text-accent-dark mt-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          Sekolah terpilih dari database
        </p>
      )}

      {/* Dropdown */}
      {open && (suggestions.length > 0 || showNewOption) && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface-card border border-border rounded-xl shadow-xl overflow-hidden">
          {suggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-widest border-b border-border bg-surface-alt">
                Sekolah yang sudah terdaftar
              </div>
              {suggestions.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSelect(school)}
                  className="w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-2.5 border-b border-border/50 last:border-0"
                >
                  <School className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{school.name}</p>
                    {(school.kecamatan || school.city || school.province) && (
                      <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[school.kecamatan, school.city, school.province].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
          {showNewOption && (
            <button
              type="button"
              onClick={handleUseNew}
              className="w-full text-left px-3 py-2.5 hover:bg-surface-alt transition-colors flex items-center gap-2.5"
            >
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                <Plus className="w-2.5 h-2.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Gunakan &ldquo;{value}&rdquo;</p>
                <p className="text-xs text-muted">Tambah sekolah baru ke database</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
