"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Film, Play } from "lucide-react";
import { Button } from "./button";

interface VideoTrailerUploaderProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  uploading?: boolean;
}

export function VideoTrailerUploader({
  currentUrl,
  onUpload,
  onRemove,
  uploading = false,
}: VideoTrailerUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        alert("File harus berupa video");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert("Ukuran video maksimal 50MB");
        return;
      }
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

  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-2">
        <Film className="w-4 h-4 inline mr-1" />
        Video Trailer (Opsional)
      </label>

      {currentUrl ? (
        <div className="relative group">
          <video
            src={currentUrl}
            controls
            className="w-full h-48 object-contain rounded-xl border border-border bg-black"
          />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" type="button" className="bg-surface-card border-border-light text-foreground">
                <Upload className="w-4 h-4" />
                Ganti
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            {onRemove && (
              <Button variant="danger" size="sm" type="button" onClick={onRemove}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragOver
              ? "border-secondary bg-secondary/10"
              : "border-border hover:border-secondary/50 hover:bg-secondary/5"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted">Mengupload video...</span>
            </div>
          ) : (
            <>
              <Play className="w-8 h-8 text-muted mb-2" />
              <span className="text-sm text-muted font-medium">
                Drag & drop video trailer di sini
              </span>
              <span className="text-xs text-muted mt-1">
                atau klik untuk pilih · MP4, WebM · Max 50MB
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
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
