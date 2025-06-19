-- Migration: Add metadata fields to files table
-- File: supabase/migrations/20250619_add_metadata_fields.sql

-- Add metadata columns to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS author text,
ADD COLUMN IF NOT EXISTS series text,
ADD COLUMN IF NOT EXISTS genre text,
ADD COLUMN IF NOT EXISTS publication_date date,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS cover_art_path text,
ADD COLUMN IF NOT EXISTS isbn text,
ADD COLUMN IF NOT EXISTS series_number integer;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_files_title ON files(title);
CREATE INDEX IF NOT EXISTS idx_files_author ON files(author);
CREATE INDEX IF NOT EXISTS idx_files_series ON files(series);
CREATE INDEX IF NOT EXISTS idx_files_genre ON files(genre);
CREATE INDEX IF NOT EXISTS idx_files_publication_date ON files(publication_date);

-- Add helpful comments
COMMENT ON COLUMN files.title IS 'Book/document title extracted from filename or manually entered';
COMMENT ON COLUMN files.author IS 'Author name extracted from filename or manually entered';
COMMENT ON COLUMN files.series IS 'Series name if book is part of a series';
COMMENT ON COLUMN files.genre IS 'Book genre/category';
COMMENT ON COLUMN files.publication_date IS 'Publication date of the book';
COMMENT ON COLUMN files.language IS 'Language of the content (default: en)';
COMMENT ON COLUMN files.description IS 'Book description or summary';
COMMENT ON COLUMN files.cover_art_path IS 'Path to cover art image in storage';
COMMENT ON COLUMN files.isbn IS 'ISBN number for books';
COMMENT ON COLUMN files.series_number IS 'Number in series if applicable';

-- Create cover-art storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-art', 'cover-art', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cover-art bucket
CREATE POLICY "Users can view their own cover art" ON storage.objects
  FOR SELECT USING (bucket_id = 'cover-art' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload cover art to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cover-art' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own cover art" ON storage.objects
  FOR UPDATE USING (bucket_id = 'cover-art' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cover art" ON storage.objects
  FOR DELETE USING (bucket_id = 'cover-art' AND auth.uid()::text = (storage.foldername(name))[1]);