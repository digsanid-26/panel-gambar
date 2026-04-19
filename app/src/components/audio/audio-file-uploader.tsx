"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioFileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  label?: string;
  accept?: string;
  compact?: boolean;
  className?: string;
  maxSizeMB?: number;
}

export function AudioFileUploader({
  onUpload,
  label = "Upload Audio",
  accept = "audio/*",
  compact = false,
  className,
  maxSizeMB = 10,
}: AudioFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Ukuran file melebihi ${maxSizeMB}MB. Silakan pilih file yang lebih kecil.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Gagal mengupload file audio.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-alt transition-colors disabled:opacity-50 ${className || ""}`}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {label}
        </button>
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={className}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {label}
      </Button>
    </>
  );
}
