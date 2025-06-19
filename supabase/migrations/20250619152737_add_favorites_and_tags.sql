-- Migration: Add favorites and tags system
-- File: supabase/migrations/20250619140000_add_favorites_and_tags.sql

-- Add favorites column to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone DEFAULT now();

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1', -- Default indigo color
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create file_tags junction table
CREATE TABLE IF NOT EXISTS file_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(file_id, tag_id)
);

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for file_tags table
CREATE POLICY "Users can view their own file tags" ON file_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own file tags" ON file_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file tags" ON file_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file tags" ON file_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_files_last_accessed ON files(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_user_id ON file_tags(user_id);

-- Add helpful comments
COMMENT ON COLUMN files.is_favorite IS 'Whether the file is marked as favorite';
COMMENT ON COLUMN files.last_accessed_at IS 'Last time the file was accessed/viewed';
COMMENT ON TABLE tags IS 'Custom tags created by users';
COMMENT ON TABLE file_tags IS 'Junction table linking files to tags';
COMMENT ON COLUMN tags.color IS 'Hex color code for tag display';