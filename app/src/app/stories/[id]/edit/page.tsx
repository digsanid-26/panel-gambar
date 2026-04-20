"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Story, Panel, Dialog, Theme, Level, TargetClass, PanelType, DisplayMode, StoryCharacter, PanelTimelineItem, NarrationOverlay, ManagedStudent } from "@/lib/types";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CoverImageUploader } from "@/components/ui/cover-image-uploader";
import { VideoTrailerUploader } from "@/components/ui/video-trailer-uploader";
import { AudioRecorder } from "@/components/audio/audio-recorder";
import { AudioPlayer } from "@/components/audio/audio-player";
import { AudioFileUploader } from "@/components/audio/audio-file-uploader";
import { CharacterManager } from "@/components/story-editor/character-manager";
import { PanelTimelineEditor } from "@/components/story-editor/panel-timeline-editor";
import { SimplePanelEditor } from "@/components/story-editor/simple-panel-editor";
import { ElementManager } from "@/components/story-editor/element-manager";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Film,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageCircle,
  Mic,
  Music,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import dynamic from "next/dynamic";

const CanvasEditor = dynamic(
  () => import("@/components/panel-editor/canvas-editor").then((m) => m.CanvasEditor),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> }
);

export default function EditStoryPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;
  const supabase = createClient();

  const [story, setStory] = useState<Story | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [showDialogForm, setShowDialogForm] = useState<string | null>(null);
  const [showNarrationRecorder, setShowNarrationRecorder] = useState<string | null>(null);
  const [showBgAudioRecorder, setShowBgAudioRecorder] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showPanelTypeMenu, setShowPanelTypeMenu] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Dynamic options from DB
  const [themes, setThemes] = useState<Theme[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [targetClasses, setTargetClasses] = useState<TargetClass[]>([]);
  const [managedStudents, setManagedStudents] = useState<ManagedStudent[]>([]);

  // Dialog form state
  const [dialogCharName, setDialogCharName] = useState("Karakter");
  const [dialogCharColor, setDialogCharColor] = useState("#3b82f6");
  const [dialogText, setDialogText] = useState("");
  const [dialogBubble, setDialogBubble] = useState("kotak");
  const [dialogPosX, setDialogPosX] = useState(50);
  const [dialogPosY, setDialogPosY] = useState(20);

  useEffect(() => {
    loadData();
  }, [storyId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Load story, panels, and dynamic options in parallel
    const [storyRes, panelsRes, themeRes, levelRes, classRes] = await Promise.all([
      supabase.from("stories").select("*").eq("id", storyId).eq("author_id", user.id).single(),
      supabase.from("panels").select("*, dialogs(*)").eq("story_id", storyId).order("order_index", { ascending: true }),
      supabase.from("themes").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("levels").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("target_classes").select("*").eq("is_active", true).order("sort_order"),
    ]);

    if (!storyRes.data) { router.push("/stories"); return; }
    setStory(storyRes.data as Story);

    if (panelsRes.data) {
      setPanels(
        panelsRes.data.map((p: Record<string, unknown>) => ({
          ...p,
          panel_type: (p.panel_type as string) || "simple",
          dialogs: ((p.dialogs as Dialog[]) || []).sort(
            (a: Dialog, b: Dialog) => a.order_index - b.order_index
          ),
        })) as Panel[]
      );
    }

    setThemes((themeRes.data || []) as Theme[]);
    setLevels((levelRes.data || []) as Level[]);
    setTargetClasses((classRes.data || []) as TargetClass[]);

    // Load managed students for character assignment
    const { data: studentsData } = await supabase
      .from("managed_students")
      .select("*")
      .eq("teacher_id", user.id)
      .order("name");
    setManagedStudents((studentsData || []) as ManagedStudent[]);

    setLoading(false);
  }

  async function addPanel(panelType: PanelType = "simple") {
    setSaving(true);
    setShowPanelTypeMenu(false);
    const { data, error } = await supabase
      .from("panels")
      .insert({
        story_id: storyId,
        order_index: panels.length,
        background_color: panelType === "simple" ? "#f0f9ff" : "#1a1a2e",
        panel_type: panelType,
      })
      .select("*, dialogs(*)")
      .single();

    if (data) {
      setPanels(prev => [...prev, { ...data, panel_type: panelType, dialogs: [] } as Panel]);
      setExpandedPanel(data.id);
    }
    setSaving(false);
  }

  async function uploadCoverImage(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !story) return;
    setUploadingCover(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/cover_${storyId}.${ext}`;
    const { error } = await supabase.storage
      .from("cover-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("cover-images").getPublicUrl(path);
      await supabase.from("stories").update({ cover_image_url: publicUrl }).eq("id", storyId);
      setStory((s) => s ? { ...s, cover_image_url: publicUrl } : s);
    }
    setUploadingCover(false);
  }

  async function uploadVideoTrailer(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !story) return;
    setUploadingVideo(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/trailer_${storyId}.${ext}`;
    const { error } = await supabase.storage
      .from("videos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(path);
      await supabase.from("stories").update({ video_trailer_url: publicUrl }).eq("id", storyId);
      setStory((s) => s ? { ...s, video_trailer_url: publicUrl } : s);
    }
    setUploadingVideo(false);
  }

  async function updateStoryField(field: string, value: string) {
    await supabase.from("stories").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", storyId);
    setStory((s) => s ? { ...s, [field]: value } : s);
  }

  async function saveCharacters(chars: StoryCharacter[]) {
    await supabase.from("stories").update({
      characters: chars as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    }).eq("id", storyId);
    setStory((s) => s ? { ...s, characters: chars } : s);
  }

  async function uploadCharacterAvatar(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${storyId}/characters/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("panel-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("panel-images").getPublicUrl(path);
    return publicUrl;
  }

  async function saveTimelineData(panelId: string, timeline: PanelTimelineItem[]) {
    await supabase.from("panels").update({
      timeline_data: timeline as unknown as Record<string, unknown>[],
    }).eq("id", panelId);
    setPanels(prev => prev.map((p) => (p.id === panelId ? { ...p, timeline_data: timeline } : p)));
  }

  /** Probe a Blob/File and return its audio duration in seconds */
  function getAudioDurationFromBlob(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.preload = "metadata";
      const cleanup = () => { audio.src = ""; audio.remove(); URL.revokeObjectURL(url); };
      audio.addEventListener("loadedmetadata", () => {
        const dur = audio.duration;
        cleanup();
        resolve(Number.isFinite(dur) ? dur : 0);
      });
      audio.addEventListener("error", () => { cleanup(); resolve(0); });
      setTimeout(() => { cleanup(); resolve(0); }, 8000);
      audio.src = url;
    });
  }

  // Keep a ref to always-latest panels so async helpers never use stale closure
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  /** Ensure a timeline entry exists for an audio type; if not, add one and persist. */
  async function ensureTimelineAudioEntry(
    panelId: string,
    audioType: "narration" | "background",
    audioDuration?: number,
  ) {
    const panel = panelsRef.current.find((p) => p.id === panelId);
    if (!panel) return;

    const tlType = audioType === "narration" ? "narration-audio" : "background-audio";
    const existing = (panel.timeline_data as PanelTimelineItem[] | undefined) || [];
    const existingItem = existing.find((it) => it.type === tlType);

    const dur = audioDuration || (audioType === "narration" ? 3 : 5);
    let updated: PanelTimelineItem[];

    if (existingItem) {
      // Update duration of existing entry
      updated = existing.map((it) =>
        it.id === existingItem.id ? { ...it, duration: Math.round(dur * 4) / 4 } : it
      );
    } else {
      // Add new entry
      const newItem: PanelTimelineItem = {
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: tlType,
        label: audioType === "narration" ? "Audio Narasi" : "Suara Latar",
        start: audioType === "narration" ? 0.5 : 0,
        duration: Math.round(dur * 4) / 4,
        color: audioType === "narration" ? "#22c55e" : "#14b8a6",
      };
      updated = [...existing, newItem];
    }

    // Expand panel duration if needed
    const panelItem = updated.find((it) => it.type === "panel");
    const maxEnd = Math.max(...updated.map((it) => it.start + it.duration));
    if (panelItem && panelItem.duration < maxEnd) {
      const idx = updated.indexOf(panelItem);
      updated[idx] = { ...panelItem, duration: Math.ceil(maxEnd) };
    }

    await saveTimelineData(panelId, updated);
  }

  /** Ensure a dialog timeline entry exists and has correct duration */
  async function ensureTimelineDialogEntry(
    panelId: string,
    dialogId: string,
    audioDuration?: number,
  ) {
    const panel = panelsRef.current.find((p) => p.id === panelId);
    if (!panel) return;

    const existing = (panel.timeline_data as PanelTimelineItem[] | undefined) || [];
    const existingItem = existing.find((it) => it.type === "dialog" && it.ref_id === dialogId);

    if (existingItem && audioDuration && audioDuration > 0) {
      // Update duration of existing entry
      const updated = existing.map((it) =>
        it.id === existingItem.id ? { ...it, duration: Math.round(audioDuration * 4) / 4 } : it
      );
      const panelItem = updated.find((it) => it.type === "panel");
      const maxEnd = Math.max(...updated.map((it) => it.start + it.duration));
      if (panelItem && panelItem.duration < maxEnd) {
        const idx = updated.indexOf(panelItem);
        updated[idx] = { ...panelItem, duration: Math.ceil(maxEnd) };
      }
      await saveTimelineData(panelId, updated);
    } else if (!existingItem) {
      // Add new dialog entry
      const dialog = panel.dialogs?.find((d) => d.id === dialogId);
      const dur = audioDuration && audioDuration > 0 ? audioDuration : 2;
      const lastEnd = Math.max(1, ...existing.filter((it) => it.type === "dialog").map((it) => it.start + it.duration));
      const newItem: PanelTimelineItem = {
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: "dialog",
        label: dialog ? `${dialog.character_name}: "${dialog.text.slice(0, 20)}..."` : "Dialog",
        ref_id: dialogId,
        start: lastEnd + 0.25,
        duration: Math.round(dur * 4) / 4,
        color: dialog?.character_color || "#f59e0b",
      };
      const updated = [...existing, newItem];
      const panelItem = updated.find((it) => it.type === "panel");
      const maxEnd = Math.max(...updated.map((it) => it.start + it.duration));
      if (panelItem && panelItem.duration < maxEnd) {
        const idx = updated.indexOf(panelItem);
        updated[idx] = { ...panelItem, duration: Math.ceil(maxEnd) };
      }
      await saveTimelineData(panelId, updated);
    }
  }

  async function saveNarrationOverlay(panelId: string, overlay: NarrationOverlay) {
    await supabase.from("panels").update({
      narration_overlay: overlay as unknown as Record<string, unknown>,
    }).eq("id", panelId);
    setPanels(prev => prev.map((p) => (p.id === panelId ? { ...p, narration_overlay: overlay } : p)));
  }

  async function saveCanvasData(panelId: string, canvasData: import("@/lib/types").CanvasData) {
    setSaving(true);
    await supabase.from("panels").update({ canvas_data: canvasData as unknown as Record<string, unknown> }).eq("id", panelId);
    setPanels(prev => prev.map((p) => (p.id === panelId ? { ...p, canvas_data: canvasData } : p)));
    setSaving(false);
  }

  async function uploadCanvasImage(panelId: string, file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${storyId}/${panelId}/asset_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("panel-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("panel-images").getPublicUrl(path);
    return publicUrl;
  }

  async function deletePanel(panelId: string) {
    if (!confirm("Hapus panel ini?")) return;
    await supabase.from("panels").delete().eq("id", panelId);
    setPanels(prev => prev.filter((p) => p.id !== panelId));
  }

  async function updatePanelField(panelId: string, field: string, value: string) {
    await supabase.from("panels").update({ [field]: value }).eq("id", panelId);
    setPanels(prev => prev.map((p) => (p.id === panelId ? { ...p, [field]: value } : p)));
  }

  async function uploadPanelImage(panelId: string, file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${storyId}/${panelId}/image.${ext}`;

    setSaving(true);
    const { error } = await supabase.storage
      .from("panel-images")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("panel-images")
        .getPublicUrl(path);
      await updatePanelField(panelId, "image_url", publicUrl);
    }
    setSaving(false);
  }

  async function uploadAudio(panelId: string, blob: Blob, type: "narration" | "background") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const path = `${user.id}/${storyId}/${panelId}/${type}_${Date.now()}.webm`;
    setSaving(true);

    const { error } = await supabase.storage
      .from("audio")
      .upload(path, blob, { contentType: "audio/webm" });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("audio")
        .getPublicUrl(path);

      const field = type === "narration" ? "narration_audio_url" : "background_audio_url";
      await updatePanelField(panelId, field, publicUrl);
      const dur = await getAudioDurationFromBlob(blob);
      await ensureTimelineAudioEntry(panelId, type, dur > 0 ? dur : undefined);
    }
    setSaving(false);
    setShowNarrationRecorder(null);
    setShowBgAudioRecorder(null);
  }

  async function addDialog(panelId: string) {
    if (!dialogText.trim()) return;
    setSaving(true);

    const panel = panels.find((p) => p.id === panelId);
    const { data, error } = await supabase
      .from("dialogs")
      .insert({
        panel_id: panelId,
        order_index: panel?.dialogs?.length || 0,
        character_name: dialogCharName,
        character_color: dialogCharColor,
        text: dialogText,
        bubble_style: dialogBubble,
        position_x: dialogPosX,
        position_y: dialogPosY,
      })
      .select()
      .single();

    if (data) {
      setPanels(prev =>
        prev.map((p) =>
          p.id === panelId
            ? { ...p, dialogs: [...(p.dialogs || []), data as Dialog] }
            : p
        )
      );
      setDialogText("");
      setShowDialogForm(null);
    }
    setSaving(false);
  }

  async function updateDialogPosition(dialogId: string, posX: number, posY: number) {
    await supabase.from("dialogs").update({ position_x: posX, position_y: posY }).eq("id", dialogId);
    setPanels((prev) =>
      prev.map((p) => ({
        ...p,
        dialogs: (p.dialogs || []).map((d) =>
          d.id === dialogId ? { ...d, position_x: posX, position_y: posY } : d
        ),
      }))
    );
  }

  async function moveDialog(panelId: string, dialogId: string, direction: "up" | "down") {
    // Compute reordered list from current state
    const panel = panelsRef.current.find((p) => p.id === panelId);
    if (!panel?.dialogs) return;
    const dialogs = [...panel.dialogs];
    const idx = dialogs.findIndex((d) => d.id === dialogId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= dialogs.length) return;
    [dialogs[idx], dialogs[swapIdx]] = [dialogs[swapIdx], dialogs[idx]];
    const reordered = dialogs.map((d, i) => ({ ...d, order_index: i }));

    // Update state
    setPanels(prev => prev.map((p) =>
      p.id === panelId ? { ...p, dialogs: reordered } : p
    ));

    // Persist to DB
    await Promise.all(
      reordered.map((d, i) =>
        supabase.from("dialogs").update({ order_index: i }).eq("id", d.id)
      )
    );
  }

  async function deleteDialog(panelId: string, dialogId: string) {
    if (!confirm("Hapus dialog ini?")) return;
    await supabase.from("dialogs").delete().eq("id", dialogId);
    setPanels(prev =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, dialogs: (p.dialogs || []).filter((d) => d.id !== dialogId) }
          : p
      )
    );
  }

  async function uploadDialogAudio(dialogId: string, panelId: string, blob: Blob) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const path = `${user.id}/${storyId}/${panelId}/dialog_${dialogId}_${Date.now()}.webm`;
    setSaving(true);

    const { error } = await supabase.storage
      .from("audio")
      .upload(path, blob, { contentType: "audio/webm" });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("audio")
        .getPublicUrl(path);
      await supabase.from("dialogs").update({ audio_url: publicUrl }).eq("id", dialogId);
      setPanels(prev =>
        prev.map((p) =>
          p.id === panelId
            ? {
                ...p,
                dialogs: (p.dialogs || []).map((d) =>
                  d.id === dialogId ? { ...d, audio_url: publicUrl } : d
                ),
              }
            : p
        )
      );
      const dur = await getAudioDurationFromBlob(blob);
      await ensureTimelineDialogEntry(panelId, dialogId, dur > 0 ? dur : undefined);
    }
    setSaving(false);
  }

  async function uploadAudioFile(panelId: string, file: File, type: "narration" | "background") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop() || "mp3";
    const path = `${user.id}/${storyId}/${panelId}/${type}_${Date.now()}.${ext}`;
    setSaving(true);

    const { error } = await supabase.storage
      .from("audio")
      .upload(path, file, { contentType: file.type });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("audio")
        .getPublicUrl(path);
      const field = type === "narration" ? "narration_audio_url" : "background_audio_url";
      await updatePanelField(panelId, field, publicUrl);
      const dur = await getAudioDurationFromBlob(file);
      await ensureTimelineAudioEntry(panelId, type, dur > 0 ? dur : undefined);
    }
    setSaving(false);
    setShowNarrationRecorder(null);
    setShowBgAudioRecorder(null);
  }

  async function uploadDialogAudioFile(dialogId: string, panelId: string, file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop() || "mp3";
    const path = `${user.id}/${storyId}/${panelId}/dialog_${dialogId}_${Date.now()}.${ext}`;
    setSaving(true);

    const { error } = await supabase.storage
      .from("audio")
      .upload(path, file, { contentType: file.type });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from("audio")
        .getPublicUrl(path);
      await supabase.from("dialogs").update({ audio_url: publicUrl }).eq("id", dialogId);
      setPanels(prev =>
        prev.map((p) =>
          p.id === panelId
            ? {
                ...p,
                dialogs: (p.dialogs || []).map((d) =>
                  d.id === dialogId ? { ...d, audio_url: publicUrl } : d
                ),
              }
            : p
        )
      );
      const dur = await getAudioDurationFromBlob(file);
      await ensureTimelineDialogEntry(panelId, dialogId, dur > 0 ? dur : undefined);
    }
    setSaving(false);
  }

  async function publishStory() {
    if (!confirm("Terbitkan cerita ini? Siswa akan bisa membacanya.")) return;
    setSaving(true);
    await supabase
      .from("stories")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", storyId);
    setStory((s) => (s ? { ...s, status: "published" } : s));
    setSaving(false);
  }

  async function unpublishStory() {
    setSaving(true);
    await supabase
      .from("stories")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", storyId);
    setStory((s) => (s ? { ...s, status: "draft" } : s));
    setSaving(false);
  }

  async function movePanelUp(index: number) {
    if (index === 0) return;
    const updated = [...panelsRef.current];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reordered = updated.map((p, i) => ({ ...p, order_index: i }));
    setPanels(reordered);
    await Promise.all(
      reordered.map((p, i) =>
        supabase.from("panels").update({ order_index: i }).eq("id", p.id)
      )
    );
  }

  async function movePanelDown(index: number) {
    if (index >= panelsRef.current.length - 1) return;
    const updated = [...panelsRef.current];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reordered = updated.map((p, i) => ({ ...p, order_index: i }));
    setPanels(reordered);
    await Promise.all(
      reordered.map((p, i) =>
        supabase.from("panels").update({ order_index: i }).eq("id", p.id)
      )
    );
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

  if (!story) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/stories/${storyId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Edit: {story.title}</h1>
                <Badge variant={story.status === "published" ? "accent" : "outline"}>
                  {story.status === "published" ? "Terbit" : "Draft"}
                </Badge>
              </div>
              <p className="text-sm text-muted">{panels.length} panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Settings className="w-4 h-4" />
              Detail
            </Button>
            <Link href={`/stories/${storyId}`}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </Link>
            {story.status === "draft" ? (
              <Button variant="accent" size="sm" onClick={publishStory} disabled={saving}>
                <Globe className="w-4 h-4" />
                Terbitkan
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={unpublishStory} disabled={saving}>
                Tarik Kembali
              </Button>
            )}
          </div>
        </div>

        {/* Story Metadata Section */}
        {showMetadata && (
          <div className="bg-surface-card rounded-xl border border-border p-5 mb-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <CoverImageUploader
                currentUrl={story.cover_image_url}
                onUpload={uploadCoverImage}
                onRemove={async () => {
                  await supabase.from("stories").update({ cover_image_url: null }).eq("id", storyId);
                  setStory((s) => s ? { ...s, cover_image_url: undefined } : s);
                }}
                uploading={uploadingCover}
              />
              <VideoTrailerUploader
                currentUrl={story.video_trailer_url}
                onUpload={uploadVideoTrailer}
                onRemove={async () => {
                  await supabase.from("stories").update({ video_trailer_url: null }).eq("id", storyId);
                  setStory((s) => s ? { ...s, video_trailer_url: undefined } : s);
                }}
                uploading={uploadingVideo}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                id="edit-theme"
                label="Tema"
                value={story.theme}
                onChange={(e) => updateStoryField("theme", e.target.value)}
                options={
                  themes.length > 0
                    ? themes.map((t) => ({ value: t.name, label: t.label }))
                    : [{ value: story.theme, label: story.theme }]
                }
              />
              <Select
                id="edit-level"
                label="Level"
                value={story.level}
                onChange={(e) => updateStoryField("level", e.target.value)}
                options={
                  levels.length > 0
                    ? levels.map((l) => ({ value: l.name, label: l.description ? `${l.label} (${l.description})` : l.label }))
                    : [{ value: story.level, label: story.level }]
                }
              />
              <Select
                id="edit-target-class"
                label="Target Kelas"
                value={story.target_class}
                onChange={(e) => updateStoryField("target_class", e.target.value)}
                options={
                  targetClasses.length > 0
                    ? targetClasses.map((c) => ({ value: c.name, label: c.description ? `${c.label} (${c.description})` : c.label }))
                    : [{ value: story.target_class, label: story.target_class }]
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="edit-kurikulum"
                label="Kurikulum"
                placeholder="Misal: Kurikulum Merdeka"
                value={story.kurikulum || ""}
                onChange={(e) => updateStoryField("kurikulum", e.target.value)}
              />
              <Input
                id="edit-mata-pelajaran"
                label="Mata Pelajaran"
                placeholder="Misal: Bahasa Indonesia"
                value={story.mata_pelajaran || ""}
                onChange={(e) => updateStoryField("mata_pelajaran", e.target.value)}
              />
              <Select
                id="edit-semester"
                label="Semester"
                value={story.semester || ""}
                onChange={(e) => updateStoryField("semester", e.target.value)}
                options={[
                  { value: "", label: "-- Pilih --" },
                  { value: "Semester 1", label: "Semester 1" },
                  { value: "Semester 2", label: "Semester 2" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="edit-sumber-cerita"
                label="Sumber Cerita"
                value={story.sumber_cerita || ""}
                onChange={(e) => updateStoryField("sumber_cerita", e.target.value)}
                options={[
                  { value: "", label: "-- Pilih --" },
                  { value: "Karangan Sendiri", label: "Karangan Sendiri" },
                  { value: "Buku", label: "Buku" },
                  { value: "Novel", label: "Novel" },
                  { value: "Novel Online", label: "Novel Online" },
                  { value: "Film", label: "Film" },
                  { value: "Cerita Rakyat", label: "Cerita Rakyat" },
                  { value: "Lainnya", label: "Lainnya" },
                ]}
              />
              <Input
                id="edit-detail-sumber"
                label="Detail Sumber"
                placeholder="Nama buku, film, novel, seri, dll"
                value={story.detail_sumber || ""}
                onChange={(e) => updateStoryField("detail_sumber", e.target.value)}
              />
            </div>

            <Textarea
              id="edit-informasi-tambahan"
              label="Informasi Tambahan"
              placeholder="Catatan atau keterangan tambahan tentang cerita ini..."
              value={story.informasi_tambahan || ""}
              onChange={(e) => updateStoryField("informasi_tambahan", e.target.value)}
            />

            {/* Display Mode Selector */}
            <div>
              <label className="block text-sm font-semibold mb-3">Mode Tampilan Cerita</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Simple panel modes */}
                <button
                  onClick={() => updateStoryField("display_mode", "slide")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${story.display_mode === "slide" || !story.display_mode ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🖼️</span>
                    <span className="font-semibold text-sm">Slide</span>
                    <Badge variant="secondary" className="text-[9px]">Sederhana</Badge>
                  </div>
                  <p className="text-xs text-muted">Navigasi panel dengan arrow dan dot indikator</p>
                </button>
                <button
                  onClick={() => updateStoryField("display_mode", "fade")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${story.display_mode === "fade" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✨</span>
                    <span className="font-semibold text-sm">Fade</span>
                    <Badge variant="secondary" className="text-[9px]">Sederhana</Badge>
                  </div>
                  <p className="text-xs text-muted">Transisi smooth fade antar panel</p>
                </button>
                <button
                  onClick={() => updateStoryField("display_mode", "continuous")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${story.display_mode === "continuous" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎞️</span>
                    <span className="font-semibold text-sm">Continuous</span>
                    <Badge variant="secondary" className="text-[9px]">Sederhana</Badge>
                  </div>
                  <p className="text-xs text-muted">Panel berjalan otomatis kanan ke kiri, berhenti saat hover</p>
                </button>
                {/* Complete panel modes */}
                <button
                  onClick={() => updateStoryField("display_mode", "vertical-scroll")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${story.display_mode === "vertical-scroll" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📜</span>
                    <span className="font-semibold text-sm">Vertical Scroll</span>
                    <Badge variant="accent" className="text-[9px]">Lengkap</Badge>
                  </div>
                  <p className="text-xs text-muted">Scroll vertikal dengan kontrol flybox dan infinity scroll</p>
                </button>
                <button
                  onClick={() => updateStoryField("display_mode", "flipbook")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${story.display_mode === "flipbook" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📖</span>
                    <span className="font-semibold text-sm">Flip Book</span>
                    <Badge variant="accent" className="text-[9px]">Lengkap</Badge>
                  </div>
                  <p className="text-xs text-muted">Animasi balik halaman seperti buku nyata</p>
                </button>
              </div>
            </div>

            {/* Character Manager (Penokohan) */}
            <CharacterManager
              characters={story.characters || []}
              onChange={saveCharacters}
              onUploadAvatar={uploadCharacterAvatar}
              availableStudents={managedStudents}
            />

            {/* Element Manager */}
            <ElementManager storyId={storyId} />
          </div>
        )}

        {/* Panels */}
        <div className="space-y-4">
          {panels.map((panel, index) => (
            <div
              key={panel.id}
              className="bg-surface-card rounded-xl border border-border overflow-hidden"
            >
              {/* Panel header */}
              <button
                onClick={() =>
                  setExpandedPanel(expandedPanel === panel.id ? null : panel.id)
                }
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-alt/50 transition-colors text-left"
              >
                <GripVertical className="w-4 h-4 text-muted shrink-0" />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); movePanelUp(index); }}
                      className="p-0.5 hover:bg-surface-alt rounded"
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); movePanelDown(index); }}
                      className="p-0.5 hover:bg-surface-alt rounded"
                      disabled={index === panels.length - 1}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {panel.image_url ? (
                  <img
                    src={panel.image_url}
                    alt=""
                    className="w-[54px] h-9 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-[54px] h-9 rounded-lg bg-surface-alt flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">Panel {index + 1}</p>
                    <Badge variant={panel.panel_type === "complete" ? "secondary" : "outline"} className="text-[10px]">
                      {panel.panel_type === "complete" ? "Lengkap" : "Sederhana"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted truncate">
                    {panel.narration_text || "Belum ada narasi"} · {panel.dialogs?.length || 0} dialog
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted transition-transform ${
                    expandedPanel === panel.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded panel editor */}
              {expandedPanel === panel.id && (
                <div className="border-t border-border px-5 py-5 space-y-5">
                  {/* Canvas Editor for complete panels */}
                  {panel.panel_type === "complete" && (
                    <CanvasEditor
                      canvasData={panel.canvas_data || null}
                      onSave={(cd) => saveCanvasData(panel.id, cd)}
                      onUploadImage={(file) => uploadCanvasImage(panel.id, file)}
                    />
                  )}

                  {/* Live editor for simple panels — image + draggable bubbles */}
                  {panel.panel_type !== "complete" && (
                    <SimplePanelEditor
                      panel={panel}
                      onUploadImage={(file) => uploadPanelImage(panel.id, file)}
                      onDialogPositionChange={updateDialogPosition}
                      onNarrationOverlayChange={(overlay) => saveNarrationOverlay(panel.id, overlay)}
                    />
                  )}

                  {/* Background color */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Warna Latar Panel</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={panel.background_color}
                        onChange={(e) => updatePanelField(panel.id, "background_color", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                      />
                      <span className="text-sm text-muted">{panel.background_color}</span>
                    </div>
                  </div>

                  {/* Narration */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      <Volume2 className="w-4 h-4 inline mr-1" />
                      Narasi
                    </label>
                    <Textarea
                      placeholder="Tuliskan narasi untuk panel ini..."
                      value={panel.narration_text || ""}
                      onChange={(e) =>
                        updatePanelField(panel.id, "narration_text", e.target.value)
                      }
                    />
                    <div className="mt-2">
                      {panel.narration_audio_url ? (
                        <div className="flex items-center gap-2">
                          <AudioPlayer src={panel.narration_audio_url} label="Audio Narasi" className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowNarrationRecorder(panel.id)}
                          >
                            <Mic className="w-4 h-4" />
                            Rekam Ulang
                          </Button>
                          <AudioFileUploader
                            label="Ganti File"
                            onUpload={(file) => uploadAudioFile(panel.id, file, "narration")}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setShowNarrationRecorder(
                                showNarrationRecorder === panel.id ? null : panel.id
                              )
                            }
                          >
                            <Mic className="w-4 h-4" />
                            Rekam
                          </Button>
                          <AudioFileUploader
                            label="Upload File"
                            onUpload={(file) => uploadAudioFile(panel.id, file, "narration")}
                          />
                        </div>
                      )}
                      {showNarrationRecorder === panel.id && (
                        <div className="mt-2">
                          <AudioRecorder
                            onSave={(blob) => uploadAudio(panel.id, blob, "narration")}
                            onCancel={() => setShowNarrationRecorder(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Background audio */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      <Music className="w-4 h-4 inline mr-1" />
                      Suara Latar (Opsional)
                    </label>
                    {panel.background_audio_url ? (
                      <div className="flex items-center gap-2">
                        <AudioPlayer src={panel.background_audio_url} label="Suara Latar" className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBgAudioRecorder(panel.id)}
                        >
                          <Mic className="w-4 h-4" />
                          Rekam Ulang
                        </Button>
                        <AudioFileUploader
                          label="Ganti File"
                          onUpload={(file) => uploadAudioFile(panel.id, file, "background")}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowBgAudioRecorder(
                              showBgAudioRecorder === panel.id ? null : panel.id
                            )
                          }
                        >
                          <Mic className="w-4 h-4" />
                          Rekam
                        </Button>
                        <AudioFileUploader
                          label="Upload File"
                          onUpload={(file) => uploadAudioFile(panel.id, file, "background")}
                        />
                      </div>
                    )}
                    {showBgAudioRecorder === panel.id && (
                      <div className="mt-2">
                        <AudioRecorder
                          onSave={(blob) => uploadAudio(panel.id, blob, "background")}
                          onCancel={() => setShowBgAudioRecorder(null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Dialogs */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      <MessageCircle className="w-4 h-4 inline mr-1" />
                      Dialog ({panel.dialogs?.length || 0})
                    </label>

                    {/* Existing dialogs */}
                    <div className="space-y-2 mb-3">
                      {panel.dialogs?.map((dialog) => (
                        <div
                          key={dialog.id}
                          className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: dialog.character_color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold" style={{ color: dialog.character_color }}>
                              {dialog.character_name}
                            </p>
                            <p className="text-sm mt-0.5">{dialog.text}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-[10px]">
                                {dialog.bubble_style}
                              </Badge>
                              <span className="text-[10px] text-muted">
                                Posisi: {dialog.position_x}%, {dialog.position_y}%
                              </span>
                              {dialog.audio_url ? (
                                <div className="flex items-center gap-1">
                                  <AudioPlayer src={dialog.audio_url} compact label="🔊" />
                                  <AudioFileUploader
                                    compact
                                    label="Ganti"
                                    onUpload={(file) => uploadDialogAudioFile(dialog.id, panel.id, file)}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <AudioRecorder
                                    onSave={(blob) => uploadDialogAudio(dialog.id, panel.id, blob)}
                                    className="!p-1.5"
                                  />
                                  <AudioFileUploader
                                    compact
                                    label="Upload"
                                    onUpload={(file) => uploadDialogAudioFile(dialog.id, panel.id, file)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => moveDialog(panel.id, dialog.id, "up")}
                              className="text-muted hover:text-foreground p-0.5 rounded transition-colors disabled:opacity-30"
                              title="Pindah ke atas"
                              disabled={panel.dialogs?.indexOf(dialog) === 0}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveDialog(panel.id, dialog.id, "down")}
                              className="text-muted hover:text-foreground p-0.5 rounded transition-colors disabled:opacity-30"
                              title="Pindah ke bawah"
                              disabled={panel.dialogs?.indexOf(dialog) === (panel.dialogs?.length || 0) - 1}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteDialog(panel.id, dialog.id)}
                              className="text-muted hover:text-danger p-0.5 rounded transition-colors"
                              title="Hapus dialog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add dialog form */}
                    {showDialogForm === panel.id ? (
                      <div className="p-4 bg-surface-alt rounded-xl border border-border space-y-3">
                        <h4 className="text-sm font-semibold">Tambah Dialog Baru</h4>

                        {/* Character selector */}
                        {(story.characters?.length || 0) > 0 ? (
                          <div>
                            <label className="block text-xs font-medium mb-1">Pilih Karakter</label>
                            <div className="flex flex-wrap gap-2">
                              {story.characters!.map((char) => (
                                <button
                                  key={char.id}
                                  type="button"
                                  onClick={() => {
                                    setDialogCharName(char.name);
                                    setDialogCharColor(char.color);
                                  }}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${
                                    dialogCharName === char.name && dialogCharColor === char.color
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:border-primary/30"
                                  }`}
                                >
                                  {char.avatar_url ? (
                                    <img src={char.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                  ) : (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                      style={{ backgroundColor: char.color }}
                                    >
                                      {char.name.charAt(0)}
                                    </div>
                                  )}
                                  {char.name}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => { setDialogCharName("Karakter"); setDialogCharColor("#3b82f6"); }}
                                className={`px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${
                                  !story.characters!.some((c) => c.name === dialogCharName && c.color === dialogCharColor)
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/30"
                                }`}
                              >
                                + Kustom
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Nama Karakter"
                            placeholder="Nama karakter"
                            value={dialogCharName}
                            onChange={(e) => setDialogCharName(e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={dialogCharColor}
                              onChange={(e) => setDialogCharColor(e.target.value)}
                              className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                            />
                            <Select
                              value={dialogBubble}
                              onChange={(e) => setDialogBubble(e.target.value)}
                              options={[
                                { value: "kotak", label: "Kotak" },
                                { value: "oval", label: "Oval" },
                                { value: "awan", label: "Awan" },
                                { value: "ledakan", label: "Ledakan" },
                              ]}
                            />
                          </div>
                        </div>
                        <Textarea
                          placeholder="Tuliskan teks dialog..."
                          value={dialogText}
                          onChange={(e) => setDialogText(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Posisi X (%)"
                            type="number"
                            min={0}
                            max={100}
                            value={dialogPosX}
                            onChange={(e) => setDialogPosX(Number(e.target.value))}
                          />
                          <Input
                            label="Posisi Y (%)"
                            type="number"
                            min={0}
                            max={100}
                            value={dialogPosY}
                            onChange={(e) => setDialogPosY(Number(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => addDialog(panel.id)}
                            disabled={saving || !dialogText.trim()}
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Tambah
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDialogForm(null)}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDialogForm(panel.id);
                          setDialogText("");
                          setDialogCharName("Karakter");
                          setDialogCharColor("#3b82f6");
                          setDialogBubble("kotak");
                          setDialogPosX(50);
                          setDialogPosY(20);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Dialog
                      </Button>
                    )}
                  </div>

                  {/* Panel Timeline Editor */}
                  <PanelTimelineEditor
                    panel={panel}
                    timelineData={(panel.timeline_data as PanelTimelineItem[]) || []}
                    onChange={(tl) => saveTimelineData(panel.id, tl)}
                  />

                  {/* Delete panel */}
                  <div className="pt-3 border-t border-border">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deletePanel(panel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Panel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add panel button */}
          <div className="relative">
            {showPanelTypeMenu ? (
              <div className="w-full border-2 border-primary/30 rounded-xl bg-surface-card p-4">
                <p className="text-sm font-semibold text-foreground mb-3 text-center">Pilih Tipe Panel</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => addPanel("simple")}
                    disabled={saving}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <ImageIcon className="w-8 h-8 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Panel Sederhana</span>
                    <span className="text-xs text-muted text-center">Satu gambar per panel</span>
                  </button>
                  <button
                    onClick={() => addPanel("complete")}
                    disabled={saving}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border hover:border-secondary/50 hover:bg-secondary/5 transition-all"
                  >
                    <Layers className="w-8 h-8 text-secondary" />
                    <span className="text-sm font-semibold text-foreground">Panel Lengkap</span>
                    <span className="text-xs text-muted text-center">Canvas editor dengan layer</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowPanelTypeMenu(false)}
                  className="w-full mt-3 text-xs text-muted hover:text-foreground transition-colors"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPanelTypeMenu(true)}
                disabled={saving}
                className="w-full py-8 border-2 border-dashed border-border rounded-xl text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
                <span className="text-sm font-semibold">Tambah Panel Baru</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
