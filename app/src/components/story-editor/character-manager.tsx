"use client";

import { useState, useRef } from "react";
import type { StoryCharacter, CharacterGender, ManagedStudent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Upload, Pencil, X, User, Check } from "lucide-react";

interface CharacterManagerProps {
  characters: StoryCharacter[];
  onChange: (characters: StoryCharacter[]) => void;
  onUploadAvatar?: (file: File) => Promise<string | null>;
  /** Available students that can be assigned to perform characters */
  availableStudents?: ManagedStudent[];
}

const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "other", label: "Lainnya" },
];

const DEFAULT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function generateId() {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function CharacterManager({ characters, onChange, onUploadAvatar, availableStudents = [] }: CharacterManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState<CharacterGender>("male");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [performedBy, setPerformedBy] = useState<string | undefined>();
  const [performedByName, setPerformedByName] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName("");
    setGender("male");
    setColor(DEFAULT_COLORS[characters.length % DEFAULT_COLORS.length]);
    setDescription("");
    setAvatarUrl(undefined);
    setPerformedBy(undefined);
    setPerformedByName(undefined);
    setEditingId(null);
    setShowAddForm(false);
  }

  function startEdit(char: StoryCharacter) {
    setEditingId(char.id);
    setName(char.name);
    setGender(char.gender);
    setColor(char.color);
    setDescription(char.description || "");
    setAvatarUrl(char.avatar_url);
    setPerformedBy(char.performed_by);
    setPerformedByName(char.performed_by_name);
    setShowAddForm(true);
  }

  function handleSave() {
    if (!name.trim()) return;

    const charData: StoryCharacter = {
      id: editingId || generateId(),
      name: name.trim(),
      avatar_url: avatarUrl,
      gender,
      color,
      description: description.trim() || undefined,
      performed_by: performedBy || undefined,
      performed_by_name: performedByName || undefined,
    };

    if (editingId) {
      onChange(characters.map((c) => (c.id === editingId ? charData : c)));
    } else {
      onChange([...characters, charData]);
    }

    resetForm();
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus karakter ini?")) return;
    onChange(characters.filter((c) => c.id !== id));
  }

  async function handleAvatarUpload(file: File) {
    if (!onUploadAvatar) return;
    setUploading(true);
    const url = await onUploadAvatar(file);
    if (url) setAvatarUrl(url);
    setUploading(false);
  }

  function getGenderEmoji(g: CharacterGender) {
    switch (g) {
      case "male": return "👦";
      case "female": return "👧";
      default: return "🧑";
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold mb-3">
        <User className="w-4 h-4 inline mr-1" />
        Pengenalan Karakter ({characters.length})
      </label>

      {/* Character list */}
      {characters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {characters.map((char) => (
            <div
              key={char.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface hover:bg-surface-alt/50 transition-colors group"
            >
              {/* Avatar */}
              {char.avatar_url ? (
                <img
                  src={char.avatar_url}
                  alt={char.name}
                  className="w-10 h-10 rounded-full object-cover border-2 shrink-0"
                  style={{ borderColor: char.color }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                  style={{ backgroundColor: char.color }}
                >
                  {char.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate" style={{ color: char.color }}>
                    {char.name}
                  </p>
                  <span className="text-xs">{getGenderEmoji(char.gender)}</span>
                </div>
                {char.description && (
                  <p className="text-xs text-muted truncate">{char.description}</p>
                )}
                {char.performed_by_name && (
                  <p className="text-[10px] text-accent truncate">🎭 {char.performed_by_name}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(char)}
                  className="p-1 text-muted hover:text-primary rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(char.id)}
                  className="p-1 text-muted hover:text-danger rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showAddForm ? (
        <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {editingId ? "Edit Karakter" : "Tambah Karakter Baru"}
            </h4>
            <button onClick={resetForm} className="text-muted hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar upload */}
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: color }}
              >
                {name ? name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !onUploadAvatar}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : avatarUrl ? "Ganti Avatar" : "Upload Avatar"}
              </Button>
              <p className="text-[10px] text-muted mt-1">Opsional · JPG, PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nama Karakter"
              placeholder="Contoh: Budi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as CharacterGender)}
              options={GENDER_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Warna</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                />
                <div className="flex gap-1 flex-wrap">
                  {DEFAULT_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Input
              label="Deskripsi (opsional)"
              placeholder="Anak laki-laki kelas 3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Performed by selector */}
          {availableStudents.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1">Diperankan Oleh</label>
              <select
                value={performedBy || ""}
                onChange={(e) => {
                  const sid = e.target.value;
                  if (!sid) {
                    setPerformedBy(undefined);
                    setPerformedByName(undefined);
                  } else {
                    const student = availableStudents.find((s) => s.id === sid);
                    setPerformedBy(sid);
                    setPerformedByName(student?.name);
                  }
                }}
                className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">-- Belum ditentukan --</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
                ))}
              </select>
              <p className="text-[10px] text-muted mt-0.5">Siswa ini akan bisa merekam dialog karakter ini</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              <Check className="w-4 h-4" />
              {editingId ? "Simpan" : "Tambah"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setColor(DEFAULT_COLORS[characters.length % DEFAULT_COLORS.length]);
            setShowAddForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Tambah Karakter
        </Button>
      )}
    </div>
  );
}
