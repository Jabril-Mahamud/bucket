-- Migration: Add bookmarks functionality
-- File: supabase/migrations/20250708145323_add_bookmarks.sql

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  note text,
  position_data jsonb NOT NULL,
  text_preview text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_file_id ON bookmarks(file_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_file ON bookmarks(user_id, file_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_position_data ON bookmarks USING gin(position_data);

-- Enable RLS on bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookmarks table
CREATE POLICY "Users can view their own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" ON bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create trigger for updated_at
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bookmarks_updated_at();

-- Function to validate bookmark position data
CREATE OR REPLACE FUNCTION validate_bookmark_position_data(position_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if position_data has required fields
  IF position_data IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must have a type field
  IF NOT (position_data ? 'type') THEN
    RETURN false;
  END IF;
  
  -- Validate based on type
  CASE position_data->>'type'
    WHEN 'text' THEN
      -- Text bookmarks need character position
      RETURN position_data ? 'character' AND 
             (position_data->>'character')::numeric >= 0;
    WHEN 'audio' THEN
      -- Audio bookmarks need timestamp
      RETURN position_data ? 'timestamp' AND 
             (position_data->>'timestamp')::numeric >= 0;
    WHEN 'pdf' THEN
      -- PDF bookmarks need page number
      RETURN position_data ? 'page' AND 
             (position_data->>'page')::numeric >= 1;
    ELSE
      RETURN false;
  END CASE;
END;
$function$;

-- Add check constraint for position data validation
ALTER TABLE bookmarks 
ADD CONSTRAINT valid_position_data 
CHECK (validate_bookmark_position_data(position_data));

-- Drop existing functions if they exist (to handle return type changes)
DROP FUNCTION IF EXISTS find_bookmarks_in_text_range(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS find_bookmarks_in_audio_range(uuid, uuid, numeric, numeric);

-- Function to find bookmarks in text range
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
    b.created_at
  FROM bookmarks b
  WHERE b.user_id = target_user_id 
    AND b.file_id = target_file_id
    AND b.position_data->>'type' = 'text'
    AND (b.position_data->>'paragraph')::integer BETWEEN start_paragraph AND end_paragraph
  ORDER BY (b.position_data->>'paragraph')::integer, (b.position_data->>'character')::integer;
END;
$function$;

-- Function to find bookmarks in audio range
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
    b.created_at
  FROM bookmarks b
  WHERE b.user_id = target_user_id 
    AND b.file_id = target_file_id
    AND b.position_data->>'type' = 'audio'
    AND (b.position_data->>'timestamp')::numeric BETWEEN start_time AND end_time_param
  ORDER BY (b.position_data->>'timestamp')::numeric;
END;
$function$;

-- Add helpful comments
COMMENT ON TABLE bookmarks IS 'Stores user bookmarks for files with flexible position tracking';
COMMENT ON COLUMN bookmarks.position_data IS 'JSON storage for position: {type: "text", character: 1250, paragraph: 5} or {type: "audio", timestamp: 125.5} or {type: "pdf", page: 10}';
COMMENT ON COLUMN bookmarks.title IS 'User-defined bookmark title';
COMMENT ON COLUMN bookmarks.note IS 'Optional user note for the bookmark';
COMMENT ON COLUMN bookmarks.text_preview IS 'Short preview text around the bookmark position';