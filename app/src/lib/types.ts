export type UserRole = "guru" | "siswa" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  school_id?: string;
  school?: string;
  created_at: string;
}

export type RecordingMode = "auto" | "manual";

export interface Story {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string;
  video_trailer_url?: string;
  theme: string;
  level: string;
  target_class: string;
  display_mode?: DisplayMode;
  characters?: StoryCharacter[];
  /** How student recordings are handled */
  recording_mode?: RecordingMode;
  /** Curriculum reference */
  kurikulum?: string;
  /** Subject / mata pelajaran */
  mata_pelajaran?: string;
  /** Semester */
  semester?: string;
  /** Story source type: Karangan sendiri, Buku, Novel Online, Film, etc. */
  sumber_cerita?: string;
  /** Source details: book name, film title, etc. */
  detail_sumber?: string;
  /** Additional information (free text) */
  informasi_tambahan?: string;
  status: "draft" | "published" | "archived";
  visibility?: "public" | "private";
  author_id: string;
  author_name?: string;
  created_at: string;
  updated_at: string;
  panels?: Panel[];
  panel_count?: number;
}

// Story character (penokohan)
export type CharacterGender = "male" | "female" | "other";

export interface StoryCharacter {
  id: string;
  name: string;
  avatar_url?: string;
  gender: CharacterGender;
  color: string;
  description?: string;
  /** Student ID assigned to perform this character */
  performed_by?: string;
  /** Student name (denormalized for display) */
  performed_by_name?: string;
}

export type PanelType = "simple" | "complete";

// Display modes for story viewer
export type SimpleDisplayMode = "slide" | "fade" | "continuous";
export type CompleteDisplayMode = "vertical-scroll" | "flipbook";
export type DisplayMode = SimpleDisplayMode | CompleteDisplayMode;

export interface NarrationOverlay {
  position_x: number;
  position_y: number;
  font_color: string;
  bg_color: string;
  opacity: number;
  font_size?: number;
  max_width?: number;
}

export interface Panel {
  id: string;
  story_id: string;
  order_index: number;
  panel_type: PanelType;
  image_url?: string;
  background_color: string;
  narration_text?: string;
  narration_audio_url?: string;
  narration_overlay?: NarrationOverlay;
  background_audio_url?: string;
  canvas_data?: CanvasData;
  timeline_data?: PanelTimelineItem[];
  created_at: string;
  dialogs?: Dialog[];
}

// Panel timeline item for sequencing element durations
export interface PanelTimelineItem {
  id: string;
  /** element type: panel-default is the base duration, others are overlays */
  type: "panel" | "narration-audio" | "background-audio" | "dialog" | "image" | "bubble" | "ar-trigger";
  label: string;
  /** Reference id (dialog id, etc.) */
  ref_id?: string;
  /** Start time in seconds relative to panel start */
  start: number;
  /** Duration in seconds */
  duration: number;
  /** Color for the timeline bar */
  color: string;
}

// Canvas data for "complete" panel type
export interface CanvasData {
  width: number;
  height: number;
  layers: CanvasLayer[];
  /** Background color behind all layers */
  backgroundColor?: string;
  /** Background image URL behind all layers */
  backgroundImage?: string;
  /** Panel border width in px (default 2) */
  borderWidth?: number;
  /** Panel border radius in px (default 16) */
  borderRadius?: number;
  /** Panel border color */
  borderColor?: string;
}

export interface CanvasLayer {
  id: string;
  type: "image" | "text" | "shape" | "speech-bubble" | "ar-trigger";
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  // Image-specific
  src?: string;
  // Text/speech-bubble specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  /** Text alignment */
  textAlign?: "left" | "center" | "right";
  // Speech bubble specific
  bubbleStyle?: "oval" | "cloud" | "jagged" | "rectangle";
  tailX?: number;
  tailY?: number;
  // Shape specific
  shapeType?: "rect" | "circle" | "polygon";
  stroke?: string;
  strokeWidth?: number;
  /** Border radius for rect shapes (px or array for individual corners) */
  borderRadius?: number;
  /** Background image URL for shapes */
  backgroundImage?: string;
  /** How the background image is sized: cover, contain, or fill */
  bgSize?: "cover" | "contain" | "fill";
  /** Background image position */
  bgPosition?: "top-left" | "top-center" | "top-right" | "center-left" | "center-center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
  /** Custom polygon points as flat [x1,y1,x2,y2,...] relative to layer origin */
  points?: number[];
  /** Skew X in degrees (for trapezoid-like shapes) */
  skewX?: number;
  /** Skew Y in degrees */
  skewY?: number;
  // AR trigger specific
  /** Slug ARScene yang dibuka saat trigger di-tap (tipe: ar-trigger) */
  arSceneSlug?: string;
  /** Label aksesibilitas untuk trigger (misal "Lihat Candi Borobudur") */
  arLabel?: string;
  /** Warna ikon trigger (default ungu/primary) */
  arIconColor?: string;
}

export interface Dialog {
  id: string;
  panel_id: string;
  order_index: number;
  character_name: string;
  character_color: string;
  text: string;
  audio_url?: string;
  bubble_style: "oval" | "kotak" | "awan" | "ledakan";
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface Recording {
  id: string;
  student_id: string;
  student_name?: string;
  story_id: string;
  panel_id: string;
  dialog_id?: string;
  type: "dialog" | "narration";
  audio_url: string;
  feedback_score?: number;
  feedback_text?: string;
  /** Whether this recording auto-replaces the original audio */
  auto_active?: boolean;
  /** Status: pending review, approved, rejected */
  status?: "pending" | "approved" | "rejected";
  created_at: string;
}

// ============================================
// School profile
// ============================================
export interface School {
  id: string;
  name: string;
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  logo_url?: string;
  teacher_id: string;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  teacher_name?: string;
  school_id?: string;
  created_at: string;
  student_count?: number;
  students?: ManagedStudent[];
}

/** Student created/managed by teacher (not self-registered) */
export interface ManagedStudent {
  id: string;
  name: string;
  username: string;
  email?: string;
  class_id: string;
  teacher_id: string;
  /** Auth user ID if linked */
  user_id?: string;
  avatar_url?: string;
  created_at: string;
}

// ============================================
// Element Manager (assets per story)
// ============================================
export type ElementAssetType = "image" | "audio" | "recording" | "file";

export interface ElementAsset {
  id: string;
  story_id: string;
  panel_id?: string;
  dialog_id?: string;
  type: ElementAssetType;
  label: string;
  url: string;
  /** Source: 'upload' | 'recording' | 'generated' */
  source: string;
  /** Who uploaded/recorded */
  created_by: string;
  created_by_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Assignment {
  id: string;
  story_id: string;
  class_id: string;
  story_title?: string;
  class_name?: string;
  deadline?: string;
  note?: string;
  created_at: string;
}

// ============================================
// Live Session (collaborative reading)
// ============================================

export type SessionStatus = "waiting" | "active" | "finished";

export interface LiveSession {
  id: string;
  code: string;
  story_id: string;
  host_id: string;
  status: SessionStatus;
  current_panel_index: number;
  created_at: string;
  ended_at?: string;
  story?: Story;
  host_name?: string;
  participants?: SessionParticipant[];
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  assigned_character?: string;
  assigned_color: string;
  is_narrator: boolean;
  joined_at: string;
  user_name?: string;
  user_role?: UserRole;
}

// ============================================
// Dynamic options (themes, levels, target classes)
// ============================================

export interface Theme {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Level {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TargetClass {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// WebRTC signaling message types
export type SignalType = "offer" | "answer" | "ice-candidate";

export interface SignalMessage {
  type: SignalType;
  from_user_id: string;
  to_user_id: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

// Broadcast event types for live session
export type BroadcastEvent =
  | { type: "panel_change"; panel_index: number }
  | { type: "highlight_dialog"; dialog_id: string; user_id: string }
  | { type: "recording_ready"; dialog_id: string; user_id: string; audio_url: string }
  | { type: "session_start" }
  | { type: "session_end" }
  | { type: "voice_activity"; user_id: string; speaking: boolean };
