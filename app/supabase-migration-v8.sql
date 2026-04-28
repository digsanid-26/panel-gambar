-- Migration v8: Dialog text styling
-- Adds an optional JSONB `text_style` column to the `dialogs` table so each
-- dialog bubble can override typography (font_family, font_size,
-- font_weight, line_height, letter_spacing, text_align) independently of
-- the panel-level defaults.
--
-- Narration typography and canvas text layers do NOT require schema changes
-- because they are already stored in JSONB columns (panels.narration_overlay
-- and panels.canvas_data respectively) and can absorb new keys directly.

ALTER TABLE public.dialogs
  ADD COLUMN IF NOT EXISTS text_style jsonb;

COMMENT ON COLUMN public.dialogs.text_style IS
  'Optional typography overrides: { font_family, font_size, font_weight, line_height, letter_spacing, text_align }. NULL means inherit panel defaults.';
