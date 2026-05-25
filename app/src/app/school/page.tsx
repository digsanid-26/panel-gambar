"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { School, UserProfile, ClassRoom, ManagedStudent } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RegionCascade, emptyRegion } from "@/components/ui/region-cascade";
import type { RegionValue } from "@/components/ui/region-cascade";
import { SchoolSearch } from "@/components/ui/school-search";
import type { SchoolRecord } from "@/components/ui/school-search";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  School as SchoolIcon,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

export default function SchoolPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // School
  const [school, setSchool] = useState<School | null>(null);
  const [schoolForm, setSchoolForm] = useState<{
    id?: string;
    name: string;
    address: string;
    phone: string;
    region: RegionValue;
  }>({
    name: "",
    address: "",
    phone: "",
    region: emptyRegion,
  });
  const [editingSchool, setEditingSchool] = useState(false);

  // Classes
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ name: "" });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Students
  const [students, setStudents] = useState<Record<string, ManagedStudent[]>>({});
  const [showStudentForm, setShowStudentForm] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({ name: "", username: "", email: "", password: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    loadData();
  }, [session, status]);

  async function loadData() {
    const profileRes = await fetch("/api/profile");
    if (!profileRes.ok) { router.push("/login"); return; }
    const profile = await profileRes.json();
    if (profile.role !== "guru" && profile.role !== "admin") { router.push("/dashboard"); return; }
    setUser(profile as UserProfile);

    const [schoolRes, classRes, studentsRes] = await Promise.all([
      fetch("/api/schools/mine"),
      fetch("/api/classrooms"),
      fetch("/api/students/managed"),
    ]);

    if (schoolRes.ok) {
      const schoolData = await schoolRes.json();
      if (schoolData) {
        setSchool(schoolData as School);
        setSchoolForm({
          id: schoolData.id,
          name: schoolData.name || "",
          address: schoolData.address || "",
          phone: schoolData.phone || "",
          region: {
            provinsi: schoolData.province || "",
            provinsiCode: schoolData.provinsiCode || "",
            kabupaten: schoolData.city || "",
            kabupatenCode: schoolData.kabupatenCode || "",
            kecamatan: schoolData.kecamatan || "",
            kecamatanCode: schoolData.kecamatanCode || "",
            kelurahan: schoolData.kelurahan || "",
            kelurahanCode: schoolData.kelurahanCode || "",
          },
        });
      }
    }

    if (classRes.ok) setClasses(await classRes.json());

    if (studentsRes.ok) {
      const studentData: ManagedStudent[] = await studentsRes.json();
      const grouped: Record<string, ManagedStudent[]> = {};
      studentData.forEach((s) => {
        const key = s.class_id ?? (s as any).classId;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });
      setStudents(grouped);
    }

    setLoading(false);
  }

  // ---- School CRUD ----
  async function saveSchool() {
    if (!user || !schoolForm.name.trim()) return;
    setSaving(true);

    const schoolPayload = {
      name: schoolForm.name,
      address: schoolForm.address,
      phone: schoolForm.phone || null,
      province: schoolForm.region.provinsi || null,
      provinsiCode: schoolForm.region.provinsiCode || null,
      city: schoolForm.region.kabupaten || null,
      kabupatenCode: schoolForm.region.kabupatenCode || null,
      kecamatan: schoolForm.region.kecamatan || null,
      kecamatanCode: schoolForm.region.kecamatanCode || null,
      kelurahan: schoolForm.region.kelurahan || null,
      kelurahanCode: schoolForm.region.kelurahanCode || null,
    };

    if (school) {
      const res = await fetch(`/api/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolPayload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSchool(updated as School);
      }
    } else {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolPayload),
      });
      if (res.ok) {
        const data = await res.json();
        setSchool(data as School);
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ school_id: data.id, school: data.name }),
        });
      }
    }
    setEditingSchool(false);
    setSaving(false);
  }

  // ---- Class CRUD ----
  async function saveClass() {
    if (!user || !classForm.name.trim()) return;
    setSaving(true);

    if (editingClassId) {
      const res = await fetch(`/api/classrooms/${editingClassId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: classForm.name }),
      });
      if (res.ok) setClasses(classes.map((c) => c.id === editingClassId ? { ...c, name: classForm.name } : c));
    } else {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: classForm.name, school_id: school?.id || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setClasses([data as ClassRoom, ...classes]);
      }
    }
    setShowClassForm(false);
    setEditingClassId(null);
    setClassForm({ name: "" });
    setSaving(false);
  }

  async function deleteClass(classId: string) {
    if (!confirm("Hapus kelas ini beserta semua siswanya?")) return;
    await fetch(`/api/classrooms/${classId}`, { method: "DELETE" });
    setClasses(classes.filter((c) => c.id !== classId));
    const newStudents = { ...students };
    delete newStudents[classId];
    setStudents(newStudents);
  }

  // ---- Student CRUD ----
  async function saveStudent(classId: string) {
    if (!user || !studentForm.name.trim() || !studentForm.username.trim()) return;
    setSaving(true);

    if (editingStudentId) {
      // Update existing student (name/username/email only, no auth change)
      await fetch(`/api/students/managed/${editingStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentForm.name, username: studentForm.username, email: studentForm.email || null }),
      });
      setStudents((prev) => ({
        ...prev,
        [classId]: (prev[classId] || []).map((s) =>
          s.id === editingStudentId
            ? { ...s, name: studentForm.name, username: studentForm.username, email: studentForm.email }
            : s
        ),
      }));
    } else {
      // Create new student via API (creates auth account + profile + managed_student)
      if (!studentForm.password || studentForm.password.length < 6) {
        alert("Password minimal 6 karakter");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentForm.name,
          username: studentForm.username,
          email: studentForm.email || undefined,
          password: studentForm.password,
          class_id: classId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal membuat akun siswa");
        setSaving(false);
        return;
      }

      const updatedRes = await fetch(`/api/students/managed?class_id=${classId}`);
      const updated = updatedRes.ok ? await updatedRes.json() : [];
      setStudents((prev) => ({ ...prev, [classId]: updated as ManagedStudent[] }));
    }

    setShowStudentForm(null);
    setEditingStudentId(null);
    setStudentForm({ name: "", username: "", email: "", password: "" });
    setSaving(false);
  }

  async function deleteStudent(classId: string, studentId: string) {
    if (!confirm("Hapus siswa ini?")) return;
    await fetch(`/api/students/${studentId}`, { method: "DELETE" });
    setStudents((prev) => ({
      ...prev,
      [classId]: (prev[classId] || []).filter((s) => s.id !== studentId),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Profil Sekolah & Kelas
        </h1>

        {/* ========== SCHOOL PROFILE ========== */}
        <section className="bg-surface-card rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <SchoolIcon className="w-4 h-4" /> Profil Sekolah
            </p>
            {school && !editingSchool && (
              <Button variant="ghost" size="sm" onClick={() => setEditingSchool(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>

          {!school || editingSchool ? (
            <div className="p-5 space-y-3">
              {/* Region cascade: Provinsi → Kabupaten → Kecamatan → Kelurahan */}
              <RegionCascade
                value={schoolForm.region}
                onChange={(region) => setSchoolForm((f) => ({ ...f, region }))}
              />

              {/* School search by name, filtered by selected region */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <SchoolIcon className="w-3.5 h-3.5 inline mr-1" />Nama Sekolah
                </label>
                <SchoolSearch
                  value={schoolForm.name}
                  selectedId={schoolForm.id}
                  region={schoolForm.region}
                  onChange={(name) => setSchoolForm((f) => ({ ...f, name }))}
                  onSelect={(s: SchoolRecord | null) => {
                    if (s) {
                      setSchoolForm((f) => ({
                        ...f,
                        id: s.id,
                        name: s.name,
                        address: s.address ?? "",
                        phone: s.phone ?? "",
                        region: {
                          provinsi: s.province ?? "",
                          provinsiCode: s.provinsiCode ?? "",
                          kabupaten: s.city ?? "",
                          kabupatenCode: s.kabupatenCode ?? "",
                          kecamatan: s.kecamatan ?? "",
                          kecamatanCode: s.kecamatanCode ?? "",
                          kelurahan: s.kelurahan ?? "",
                          kelurahanCode: s.kelurahanCode ?? "",
                        },
                      }));
                    } else {
                      setSchoolForm((f) => ({ ...f, id: undefined }));
                    }
                  }}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />Alamat Sekolah
                </label>
                <Textarea
                  placeholder="Alamat lengkap sekolah..."
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                />
              </div>

              {/* Phone */}
              <Input
                label="Telepon"
                placeholder="021-12345678"
                value={schoolForm.phone}
                onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={saveSchool} disabled={saving || !schoolForm.name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan
                </Button>
                {school && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingSchool(false)}>Batal</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <h3 className="text-lg font-bold">{school.name}</h3>
              {school.address && <p className="text-sm text-muted mt-1">{school.address}</p>}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted">
                {school.kecamatan && <span>{school.kecamatan}</span>}
                {school.city && <span>{school.kecamatan ? "·" : ""} {school.city}</span>}
                {school.province && <span>· {school.province}</span>}
                {school.postalCode && <span>· {school.postalCode}</span>}
                {school.phone && <span>· {school.phone}</span>}
              </div>
            </div>
          )}
        </section>

        {/* ========== CLASSES ========== */}
        <section className="bg-surface-card rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Kelas ({classes.length})
            </p>
            <Button variant="primary" size="sm" onClick={() => { setShowClassForm(true); setEditingClassId(null); setClassForm({ name: "" }); }}>
              <Plus className="w-4 h-4" /> Tambah Kelas
            </Button>
          </div>

          {/* Add/Edit class form */}
          {showClassForm && (
            <div className="px-5 py-3 border-b border-border bg-surface-alt/50 flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label={editingClassId ? "Edit Nama Kelas" : "Nama Kelas Baru"}
                  placeholder="Kelas 1A"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ name: e.target.value })}
                />
              </div>
              <Button variant="primary" size="sm" onClick={saveClass} disabled={saving || !classForm.name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingClassId ? "Update" : "Tambah"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowClassForm(false); setEditingClassId(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Class list */}
          <div className="divide-y divide-border">
            {classes.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Belum ada kelas. Buat kelas pertama!</p>
            )}
            {classes.map((cls) => {
              const isExpanded = expandedClass === cls.id;
              const classStudents = students[cls.id] || [];
              return (
                <div key={cls.id}>
                  {/* Class header */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedClass(isExpanded ? null : cls.id)}
                      className="shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{cls.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted bg-surface-alt px-2 py-0.5 rounded-full flex items-center gap-1">
                          Kode: <strong>{cls.code}</strong>
                          <button onClick={() => navigator.clipboard.writeText(cls.code)} className="hover:text-primary">
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                        <span className="text-[10px] text-muted">
                          <Users className="w-3 h-3 inline" /> {classStudents.length} siswa
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowClassForm(true);
                      setEditingClassId(cls.id);
                      setClassForm({ name: cls.name });
                    }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <button onClick={() => deleteClass(cls.id)} className="p-1.5 text-muted hover:text-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Expanded: Student list */}
                  {isExpanded && (
                    <div className="bg-surface-alt/30 border-t border-border px-5 py-3">
                      {/* Student table */}
                      {classStudents.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {classStudents.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-surface-card rounded-lg border border-border">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{s.name}</p>
                                <p className="text-[10px] text-muted">
                                  @{s.username}{s.email ? ` · ${s.email}` : ""}
                                  {s.user_id
                                    ? <span className="ml-1.5 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ Bisa login</span>
                                    : <span className="ml-1.5 text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">Belum ada akun</span>
                                  }
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setShowStudentForm(cls.id);
                                setEditingStudentId(s.id);
                                setStudentForm({ name: s.name, username: s.username, email: s.email || "", password: "" });
                              }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <button onClick={() => deleteStudent(cls.id, s.id)} className="p-1 text-muted hover:text-danger">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add student form */}
                      {showStudentForm === cls.id ? (
                        <div className="p-3 bg-surface-card rounded-xl border border-border space-y-2">
                          <p className="text-xs font-semibold">{editingStudentId ? "Edit Siswa" : "Tambah Siswa Baru"}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="Nama Lengkap"
                              placeholder="Budi Santoso"
                              value={studentForm.name}
                              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                              required
                            />
                            <Input
                              label="Username"
                              placeholder="budi.s"
                              value={studentForm.username}
                              onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="Email (opsional)"
                              type="email"
                              placeholder="budi@email.com"
                              value={studentForm.email}
                              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                            />
                            {!editingStudentId && (
                              <Input
                                label="Password"
                                type="password"
                                placeholder="Password login"
                                value={studentForm.password}
                                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                              />
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => saveStudent(cls.id)}
                              disabled={saving || !studentForm.name.trim() || !studentForm.username.trim()}
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              {editingStudentId ? "Update" : "Tambah"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setShowStudentForm(null); setEditingStudentId(null); }}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowStudentForm(cls.id);
                            setEditingStudentId(null);
                            setStudentForm({ name: "", username: "", email: "", password: "" });
                          }}
                        >
                          <Plus className="w-4 h-4" /> Tambah Siswa
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
