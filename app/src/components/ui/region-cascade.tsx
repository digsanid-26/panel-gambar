"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

export interface RegionValue {
  provinsi: string;
  provinsiCode: string;
  kabupaten: string;
  kabupatenCode: string;
  kecamatan: string;
  kecamatanCode: string;
  kelurahan: string;
  kelurahanCode: string;
}

export const emptyRegion: RegionValue = {
  provinsi: "", provinsiCode: "",
  kabupaten: "", kabupatenCode: "",
  kecamatan: "", kecamatanCode: "",
  kelurahan: "", kelurahanCode: "",
};

interface WilayahItem { id: string; name: string; }

function WilayahSelect({ label, placeholder, items, selectedId, onChange, disabled, loading }: {
  label: string;
  placeholder: string;
  items: WilayahItem[];
  selectedId: string;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => {
            const item = items.find((i) => i.id === e.target.value);
            onChange(e.target.value, item?.name ?? "");
          }}
          disabled={disabled || loading}
          className="w-full appearance-none px-3 py-2.5 pr-9 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{loading ? "Memuat..." : placeholder}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
    </div>
  );
}

interface RegionCascadeProps {
  value: RegionValue;
  onChange: (value: RegionValue) => void;
}

export function RegionCascade({ value, onChange }: RegionCascadeProps) {
  const [provinsiList, setProvinsiList] = useState<WilayahItem[]>([]);
  const [kabupatenList, setKabupatenList] = useState<WilayahItem[]>([]);
  const [kecamatanList, setKecamatanList] = useState<WilayahItem[]>([]);
  const [kelurahanList, setKelurahanList] = useState<WilayahItem[]>([]);

  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingKab, setLoadingKab] = useState(false);
  const [loadingKec, setLoadingKec] = useState(false);
  const [loadingKel, setLoadingKel] = useState(false);

  const restoredRef = useRef(false);

  // Load provinces on mount
  useEffect(() => {
    setLoadingProv(true);
    fetch("/api/wilayah?level=provinsi")
      .then((r) => r.json())
      .then((data: WilayahItem[]) => setProvinsiList(data))
      .catch(() => {})
      .finally(() => setLoadingProv(false));
  }, []);

  // Restore cascaded state from codes when provinces are loaded
  useEffect(() => {
    if (provinsiList.length === 0 || restoredRef.current) return;
    if (!value.provinsiCode) return;
    restoredRef.current = true;

    async function restore() {
      // Load kabupaten for the stored provinsiCode
      if (!value.provinsiCode) return;
      setLoadingKab(true);
      const kabRes = await fetch(`/api/wilayah?level=kabupaten&parentId=${value.provinsiCode}`);
      const kabList: WilayahItem[] = await kabRes.json();
      setKabupatenList(kabList);
      setLoadingKab(false);

      if (!value.kabupatenCode) return;
      setLoadingKec(true);
      const kecRes = await fetch(`/api/wilayah?level=kecamatan&parentId=${value.kabupatenCode}`);
      const kecList: WilayahItem[] = await kecRes.json();
      setKecamatanList(kecList);
      setLoadingKec(false);

      if (!value.kecamatanCode) return;
      setLoadingKel(true);
      const kelRes = await fetch(`/api/wilayah?level=kelurahan&parentId=${value.kecamatanCode}`);
      const kelList: WilayahItem[] = await kelRes.json();
      setKelurahanList(kelList);
      setLoadingKel(false);
    }
    restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinsiList]);

  function handleProvinsi(id: string, name: string) {
    restoredRef.current = true;
    setKabupatenList([]);
    setKecamatanList([]);
    setKelurahanList([]);
    onChange({ provinsi: name, provinsiCode: id, kabupaten: "", kabupatenCode: "", kecamatan: "", kecamatanCode: "", kelurahan: "", kelurahanCode: "" });
    if (!id) return;
    setLoadingKab(true);
    fetch(`/api/wilayah?level=kabupaten&parentId=${id}`)
      .then((r) => r.json())
      .then((data: WilayahItem[]) => setKabupatenList(data))
      .catch(() => {})
      .finally(() => setLoadingKab(false));
  }

  function handleKabupaten(id: string, name: string) {
    setKecamatanList([]);
    setKelurahanList([]);
    onChange({ ...value, kabupaten: name, kabupatenCode: id, kecamatan: "", kecamatanCode: "", kelurahan: "", kelurahanCode: "" });
    if (!id) return;
    setLoadingKec(true);
    fetch(`/api/wilayah?level=kecamatan&parentId=${id}`)
      .then((r) => r.json())
      .then((data: WilayahItem[]) => setKecamatanList(data))
      .catch(() => {})
      .finally(() => setLoadingKec(false));
  }

  function handleKecamatan(id: string, name: string) {
    setKelurahanList([]);
    onChange({ ...value, kecamatan: name, kecamatanCode: id, kelurahan: "", kelurahanCode: "" });
    if (!id) return;
    setLoadingKel(true);
    fetch(`/api/wilayah?level=kelurahan&parentId=${id}`)
      .then((r) => r.json())
      .then((data: WilayahItem[]) => setKelurahanList(data))
      .catch(() => {})
      .finally(() => setLoadingKel(false));
  }

  function handleKelurahan(id: string, name: string) {
    onChange({ ...value, kelurahan: name, kelurahanCode: id });
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <WilayahSelect
        label="Provinsi"
        placeholder="-- Pilih Provinsi --"
        items={provinsiList}
        selectedId={value.provinsiCode}
        loading={loadingProv}
        onChange={handleProvinsi}
      />
      <WilayahSelect
        label="Kabupaten / Kota"
        placeholder={value.provinsiCode ? "-- Pilih Kabupaten/Kota --" : "Pilih provinsi dulu"}
        items={kabupatenList}
        selectedId={value.kabupatenCode}
        loading={loadingKab}
        disabled={!value.provinsiCode}
        onChange={handleKabupaten}
      />
      <WilayahSelect
        label="Kecamatan"
        placeholder={value.kabupatenCode ? "-- Pilih Kecamatan --" : "Pilih kabupaten dulu"}
        items={kecamatanList}
        selectedId={value.kecamatanCode}
        loading={loadingKec}
        disabled={!value.kabupatenCode}
        onChange={handleKecamatan}
      />
      <WilayahSelect
        label="Kelurahan / Desa"
        placeholder={value.kecamatanCode ? "-- Pilih Kelurahan --" : "Pilih kecamatan dulu"}
        items={kelurahanList}
        selectedId={value.kelurahanCode}
        loading={loadingKel}
        disabled={!value.kecamatanCode}
        onChange={handleKelurahan}
      />
    </div>
  );
}
