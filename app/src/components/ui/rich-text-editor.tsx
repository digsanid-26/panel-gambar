"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Code, Link2, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Quote, Minus,
  Heading1, Heading2, Heading3, Undo, Redo,
  Upload, FolderOpen, X, Loader2,
} from "lucide-react";
import { AssetPickerModal } from "@/components/asset-library/asset-picker-modal";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-surface-alt transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted"}`}
    >
      {children}
    </button>
  );
}

function ImageInsertModal({ open, onClose, onInsert }: {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}) {
  const [tab, setTab] = useState<"upload" | "gallery">("upload");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Ukuran file maksimal 5MB"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      onInsert(url);
      onClose();
    }
  }, [onInsert, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Sisipkan Gambar
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-alt text-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["upload", "gallery"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t === "upload" ? <><Upload className="w-3.5 h-3.5" />Upload</> : <><FolderOpen className="w-3.5 h-3.5" />Dari Galeri</>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "upload" ? (
            <div
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`flex flex-col items-center justify-center h-44 border-2 border-dashed rounded-xl transition-colors ${
                uploading ? "border-primary/30 cursor-not-allowed" :
                dragOver ? "border-primary bg-primary/10 cursor-copy" :
                "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted">Mengupload...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted mb-2" />
                  <p className="text-sm font-medium text-foreground">Drag & drop atau klik pilih gambar</p>
                  <p className="text-xs text-muted mt-1">JPG, PNG, WebP · Maks 5MB</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-muted text-center">
                Pilih gambar dari galeri aset yang sudah diupload sebelumnya.
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Buka Galeri
              </button>
            </div>
          )}
        </div>
      </div>

      {pickerOpen && (
        <AssetPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          type={["image", "avatar"]}
          onPick={(asset) => { setPickerOpen(false); onInsert(asset.url); onClose(); }}
          title="Pilih Gambar dari Galeri"
        />
      )}
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder = "Tulis konten di sini...", minHeight = "320px" }: RichTextEditorProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded-xl my-4" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none p-4" },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt("URL link:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  const insertImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden bg-surface-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-surface-alt">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3"><Heading3 className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code"><Code className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Rata kiri"><AlignLeft className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Rata tengah"><AlignCenter className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Rata kanan"><AlignRight className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Daftar bulat"><List className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Daftar nomor"><ListOrdered className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Kutipan"><Quote className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Garis pemisah"><Minus className="w-4 h-4" /></ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link"><Link2 className="w-4 h-4" /></ToolbarButton>
          <ToolbarButton onClick={() => setImageModalOpen(true)} title="Sisipkan gambar">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>
        {/* Editor area */}
        <EditorContent editor={editor} style={{ minHeight }} />
      </div>

      <ImageInsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={insertImage}
      />
    </>
  );
}
