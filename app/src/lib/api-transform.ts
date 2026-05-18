export function transformStory(s: Record<string, unknown>) {
  const {
    coverImageUrl, videoTrailerUrl, targetClass, displayMode, recordingMode,
    authorId, mataPelajaran, sumberCerita, detailSumber, informasiTambahan,
    capaianPembelajaran, tujuanPembelajaran, pertanyaanPemantik, alokasiWaktu,
    kataKunci, asesmenJenis, asesmenDeskripsi, refleksiSiswa, refleksiGuru,
    sumberBelajar, metodePembelajaran, materiPokok, pendekatanPembelajaran,
    evaluasiGuru, linkQuiz, createdAt, updatedAt, author, _count, panels, ...rest
  } = s as any;
  return {
    ...rest,
    cover_image_url: coverImageUrl,
    video_trailer_url: videoTrailerUrl,
    target_class: targetClass,
    display_mode: displayMode,
    recording_mode: recordingMode,
    author_id: authorId,
    mata_pelajaran: mataPelajaran,
    sumber_cerita: sumberCerita,
    detail_sumber: detailSumber,
    informasi_tambahan: informasiTambahan,
    capaian_pembelajaran: capaianPembelajaran,
    tujuan_pembelajaran: tujuanPembelajaran,
    pertanyaan_pemantik: pertanyaanPemantik,
    alokasi_waktu: alokasiWaktu,
    kata_kunci: kataKunci,
    asesmen_jenis: asesmenJenis,
    asesmen_deskripsi: asesmenDeskripsi,
    refleksi_siswa: refleksiSiswa,
    refleksi_guru: refleksiGuru,
    sumber_belajar: sumberBelajar,
    metode_pembelajaran: metodePembelajaran,
    materi_pokok: materiPokok,
    pendekatan_pembelajaran: pendekatanPembelajaran,
    evaluasi_guru: evaluasiGuru,
    link_quiz: linkQuiz,
    created_at: createdAt,
    updated_at: updatedAt,
    ...(author !== undefined ? {
      author: author ? { ...author, avatar_url: author.avatarUrl } : author,
    } : {}),
    ...(_count !== undefined ? { panel_count: _count?.panels } : {}),
    ...(panels !== undefined ? { panels: Array.isArray(panels) ? (panels as Record<string, unknown>[]).map(transformPanel) : panels } : {}),
  };
}

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
