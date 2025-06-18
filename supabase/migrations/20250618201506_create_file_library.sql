-- Migration: Create file library tables and storage setup
-- File: supabase/migrations/20250618_create_file_library.sql

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Create file_progress table for tracking reading/listening progress
CREATE TABLE IF NOT EXISTS file_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  progress_percentage decimal DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_position text, -- For audio: timestamp (e.g. "125.5"), for PDF: page number (e.g. "5")
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, file_id)
);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files table
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for file_progress table
CREATE POLICY "Users can view their own progress" ON file_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON file_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON file_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON file_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for user-files bucket
CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload files to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_progress_user_file ON file_progress(user_id, file_id);

-- Add helpful comments
COMMENT ON TABLE files IS 'Stores metadata for user-uploaded files';
COMMENT ON TABLE file_progress IS 'Tracks reading/listening progress for files';
COMMENT ON COLUMN file_progress.last_position IS 'Stores current position: audio timestamp or PDF page number';
COMMENT ON COLUMN file_progress.progress_percentage IS 'Progress as percentage (0-100)';