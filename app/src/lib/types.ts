export type UserRole = "guru" | "siswa" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  school?: string;
  created_at: string;
}

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
  status: "draft" | "published" | "archived";
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
}

export type PanelType = "simple" | "complete";

// Display modes for story viewer
export type SimpleDisplayMode = "slide" | "fade" | "continuous";
export type CompleteDisplayMode = "vertical-scroll" | "flipbook";
export type DisplayMode = SimpleDisplayMode | CompleteDisplayMode;

export interface Panel {
  id: string;
  story_id: string;
  order_index: number;
  panel_type: PanelType;
  image_url?: string;
  background_color: string;
  narration_text?: string;
  narration_audio_url?: string;
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
  type: "panel" | "narration-audio" | "background-audio" | "dialog" | "image" | "bubble";
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
}

export interface CanvasLayer {
  id: string;
  type: "image" | "text" | "shape" | "speech-bubble";
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
  // Speech bubble specific
  bubbleStyle?: "oval" | "cloud" | "jagged" | "rectangle";
  tailX?: number;
  tailY?: number;
  // Shape specific
  shapeType?: "rect" | "circle" | "polygon";
  stroke?: string;
  strokeWidth?: number;
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
  created_at: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  teacher_name?: string;
  created_at: string;
  student_count?: number;
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
