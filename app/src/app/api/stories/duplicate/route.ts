import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/stories/duplicate
 * Deep-copies a published story (story + panels + dialogs) into the caller's account.
 * Audio URLs are preserved (shared references), but the new story is a draft owned by the caller.
 *
 * Body: { story_id: string }
 * Returns: { new_story_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Verify caller
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check caller is guru/admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "guru" && profile.role !== "admin")) {
    return NextResponse.json(
      { error: "Hanya guru/admin yang bisa menduplikasi cerita" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { story_id } = body as { story_id: string };

  if (!story_id) {
    return NextResponse.json({ error: "story_id required" }, { status: 400 });
  }

  // Load original story
  const { data: original, error: storyErr } = await supabase
    .from("stories")
    .select("*")
    .eq("id", story_id)
    .single();

  if (storyErr || !original) {
    return NextResponse.json({ error: "Cerita tidak ditemukan" }, { status: 404 });
  }

  // Only allow duplicating published stories (or own stories)
  if (original.status !== "published" && original.author_id !== user.id) {
    return NextResponse.json(
      { error: "Hanya cerita yang sudah dipublikasi yang bisa diduplikasi" },
      { status: 403 }
    );
  }

  try {
    // 1. Create new story (draft, owned by caller)
    const { data: newStory, error: insertErr } = await supabase
      .from("stories")
      .insert({
        title: `${original.title} (Salinan)`,
        description: original.description,
        cover_image_url: original.cover_image_url,
        video_trailer_url: original.video_trailer_url,
        theme: original.theme,
        level: original.level,
        target_class: original.target_class,
        display_mode: original.display_mode,
        characters: original.characters,
        recording_mode: original.recording_mode,
        status: "draft",
        author_id: user.id,
      })
      .select()
      .single();

    if (insertErr || !newStory) {
      return NextResponse.json(
        { error: insertErr?.message || "Gagal membuat salinan cerita" },
        { status: 500 }
      );
    }

    // 2. Load original panels with dialogs
    const { data: originalPanels } = await supabase
      .from("panels")
      .select("*, dialogs(*)")
      .eq("story_id", story_id)
      .order("order_index", { ascending: true });

    if (originalPanels && originalPanels.length > 0) {
      for (const panel of originalPanels) {
        // Insert panel copy
        const { data: newPanel } = await supabase
          .from("panels")
          .insert({
            story_id: newStory.id,
            order_index: panel.order_index,
            panel_type: panel.panel_type,
            image_url: panel.image_url,
            background_color: panel.background_color,
            narration_text: panel.narration_text,
            narration_audio_url: panel.narration_audio_url,
            narration_overlay: panel.narration_overlay,
            background_audio_url: panel.background_audio_url,
            canvas_data: panel.canvas_data,
            timeline_data: panel.timeline_data,
          })
          .select()
          .single();

        if (!newPanel) continue;

        // Copy dialogs for this panel
        const dialogs = (panel.dialogs || []) as Array<Record<string, unknown>>;
        if (dialogs.length > 0) {
          await supabase.from("dialogs").insert(
            dialogs.map((d) => ({
              panel_id: newPanel.id,
              order_index: d.order_index,
              character_name: d.character_name,
              character_color: d.character_color,
              text: d.text,
              audio_url: d.audio_url,
              bubble_style: d.bubble_style,
              position_x: d.position_x,
              position_y: d.position_y,
            }))
          );
        }
      }
    }

    return NextResponse.json({
      new_story_id: newStory.id,
      message: `Cerita "${original.title}" berhasil diduplikasi`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
