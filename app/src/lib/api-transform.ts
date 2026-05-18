export function transformDialog(d: Record<string, unknown>) {
  const { panelId, orderIndex, characterName, characterColor, bubbleStyle, positionX, positionY, audioUrl, textStyle, createdAt, ...rest } = d as any;
  return {
    ...rest,
    panel_id: panelId,
    order_index: orderIndex,
    character_name: characterName,
    character_color: characterColor,
    bubble_style: bubbleStyle,
    position_x: positionX,
    position_y: positionY,
    audio_url: audioUrl,
    text_style: textStyle,
    created_at: createdAt,
  };
}

export function transformPanel(p: Record<string, unknown>) {
  const { storyId, orderIndex, panelType, imageUrl, backgroundColor, narrationText, narrationAudioUrl, backgroundAudioUrl, narrationOverlay, timelineData, canvasData, createdAt, dialogs, ...rest } = p as any;
  return {
    ...rest,
    story_id: storyId,
    order_index: orderIndex,
    panel_type: panelType,
    image_url: imageUrl,
    background_color: backgroundColor,
    narration_text: narrationText,
    narration_audio_url: narrationAudioUrl,
    background_audio_url: backgroundAudioUrl,
    narration_overlay: narrationOverlay,
    timeline_data: timelineData,
    canvas_data: canvasData,
    created_at: createdAt,
    dialogs: dialogs ? (dialogs as Record<string, unknown>[]).map(transformDialog) : undefined,
  };
}
