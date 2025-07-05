-- Migration: Add bookmarks functionality
-- File: supabase/migrations/add_bookmarks.sql

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  note text,
  position_data jsonb NOT NULL, -- Flexible position storage: {type: 'text', character: 1250} or {type: 'audio', timestamp: 125.5}
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_file_id ON bookmarks(file_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_file ON bookmarks(user_id, file_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

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

-- Add helpful comments
COMMENT ON TABLE bookmarks IS 'Stores user bookmarks for files';
COMMENT ON COLUMN bookmarks.position_data IS 'Flexible JSON storage for position: text character offset, audio timestamp, etc.';
COMMENT ON COLUMN bookmarks.title IS 'User-defined bookmark title';
COMMENT ON COLUMN bookmarks.note IS 'Optional user note for the bookmark';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bookmarks_updated_at();