-- Migration: Add bookmark colors and improvements
-- File: supabase/migrations/20250709122720_add_bookmark_colors.sql

-- Add color field to bookmarks table
ALTER TABLE bookmarks 
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS color_index integer;

-- Add index for color-based queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_color ON bookmarks(color);
CREATE INDEX IF NOT EXISTS idx_bookmarks_color_index ON bookmarks(color_index);

-- Function to generate pastel color for bookmark
CREATE OR REPLACE FUNCTION generate_bookmark_color(bookmark_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  -- Predefined pastel colors
  colors text[] := ARRAY[
    'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo',
    'blue', 'sky', 'cyan', 'teal', 'emerald', 'green',
    'lime', 'yellow', 'amber', 'orange', 'red', 'stone'
  ];
  color_index integer;
BEGIN
  -- Generate deterministic index from bookmark ID
  color_index := (('x' || substring(bookmark_id::text, 1, 8))::bit(32)::int % array_length(colors, 1)) + 1;
  
  RETURN colors[color_index];
END;
$function$;

-- Function to get bookmark color index
CREATE OR REPLACE FUNCTION generate_bookmark_color_index(bookmark_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  max_colors integer := 18; -- Total number of pastel colors we support
BEGIN
  -- Generate deterministic index from bookmark ID (0-17)
  RETURN ('x' || substring(bookmark_id::text, 1, 8))::bit(32)::int % max_colors;
END;
$function$;

-- Trigger to auto-assign colors to new bookmarks
CREATE OR REPLACE FUNCTION assign_bookmark_color()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only assign color if not provided
  IF NEW.color IS NULL THEN
    NEW.color := generate_bookmark_color(NEW.id);
  END IF;
  
  -- Always assign color_index for deterministic coloring
  NEW.color_index := generate_bookmark_color_index(NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-assigning colors
CREATE TRIGGER assign_bookmark_color_trigger
  BEFORE INSERT ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION assign_bookmark_color();

-- Update existing bookmarks to have colors (if any exist)
UPDATE bookmarks 
SET 
  color = generate_bookmark_color(id),
  color_index = generate_bookmark_color_index(id)
WHERE color IS NULL;

-- Add constraint for valid colors
ALTER TABLE bookmarks 
ADD CONSTRAINT valid_color 
CHECK (color IN (
  'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo',
  'blue', 'sky', 'cyan', 'teal', 'emerald', 'green',
  'lime', 'yellow', 'amber', 'orange', 'red', 'stone'
) OR color IS NULL);

-- Add constraint for valid color_index
ALTER TABLE bookmarks 
ADD CONSTRAINT valid_color_index 
CHECK (color_index >= 0 AND color_index < 18);

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS find_bookmarks_in_text_range(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS find_bookmarks_in_audio_range(uuid, uuid, numeric, numeric);

-- Update the bookmark search functions to include color information
CREATE OR REPLACE FUNCTION find_bookmarks_in_text_range(
  target_user_id uuid,
  target_file_id uuid,
  start_paragraph integer DEFAULT 0,
  end_paragraph integer DEFAULT 999999
)
RETURNS TABLE (
  id uuid,
  title text,
  note text,
  paragraph_num integer,
  character_pos integer,
  text_preview text,
  color text,
  color_index integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.note,
    (b.position_data->>'paragraph')::integer as paragraph_num,
    (b.position_data->>'character')::integer as character_pos,
    b.text_preview,
    b.color,
    b.color_index,
    b.created_at
  FROM bookmarks b
  WHERE b.user_id = target_user_id 
    AND b.file_id = target_file_id
    AND b.position_data->>'type' = 'text'
    AND (b.position_data->>'paragraph')::integer BETWEEN start_paragraph AND end_paragraph
  ORDER BY (b.position_data->>'paragraph')::integer, (b.position_data->>'character')::integer;
END;
$function$;

CREATE OR REPLACE FUNCTION find_bookmarks_in_audio_range(
  target_user_id uuid,
  target_file_id uuid,
  start_time numeric DEFAULT 0,
  end_time_param numeric DEFAULT 999999
)
RETURNS TABLE (
  id uuid,
  title text,
  note text,
  time_position numeric,
  end_time_position numeric,
  text_preview text,
  color text,
  color_index integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.note,
    (b.position_data->>'timestamp')::numeric as time_position,
    (b.position_data->>'end_timestamp')::numeric as end_time_position,
    b.text_preview,
    b.color,
    b.color_index,
    b.created_at
  FROM bookmarks b
  WHERE b.user_id = target_user_id 
    AND b.file_id = target_file_id
    AND b.position_data->>'type' = 'audio'
    AND (b.position_data->>'timestamp')::numeric BETWEEN start_time AND end_time_param
  ORDER BY (b.position_data->>'timestamp')::numeric;
END;
$function$;

-- Function to get all bookmarks for a file with colors
CREATE OR REPLACE FUNCTION get_file_bookmarks(
  target_user_id uuid,
  target_file_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  note text,
  position_data jsonb,
  text_preview text,
  color text,
  color_index integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.note,
    b.position_data,
    b.text_preview,
    b.color,
    b.color_index,
    b.created_at,
    b.updated_at
  FROM bookmarks b
  WHERE b.user_id = target_user_id 
    AND b.file_id = target_file_id
  ORDER BY b.created_at DESC;
END;
$function$;

-- Add helpful comments
COMMENT ON COLUMN bookmarks.color IS 'Pastel color name for bookmark visualization';
COMMENT ON COLUMN bookmarks.color_index IS 'Deterministic color index (0-17) for consistent coloring';