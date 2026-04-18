"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "./button";

interface CoverImageUploaderProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  uploading?: boolean;
}

export function CoverImageUploader({
  currentUrl,
  onUpload,
  onRemove,
  uploading = false,
}: CoverImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file maksimal 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      await onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const displayUrl = preview || currentUrl;

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        <ImageIcon className="w-4 h-4 inline mr-1" />
        Cover Cerita
      </label>

      {displayUrl ? (
        <div className="relative group">
          <img
            src={displayUrl}
            alt="Cover"
            className="w-full aspect-[3/2] object-cover rounded-xl border border-border"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" type="button" className="bg-surface-card border-border-light text-foreground">
                <Upload className="w-4 h-4" />
                Ganti
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            {onRemove && (
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={() => {
                  setPreview(null);
                  onRemove();
                }}
              >
                <X className="w-4 h-4" />
                Hapus
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-full aspect-[3/2] border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted">Mengupload...</span>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted mb-2" />
              <span className="text-sm text-muted font-medium">
                Drag & drop gambar di sini
              </span>
              <span className="text-xs text-muted mt-1">
                atau klik untuk pilih file · JPG, PNG, WebP · Max 5MB
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}
    </div>
  );
}
