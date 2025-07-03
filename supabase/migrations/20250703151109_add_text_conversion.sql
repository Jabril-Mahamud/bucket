-- Migration: Add text conversion support
-- File: supabase/migrations/20250703_add_text_conversion.sql

-- Add columns to files table for text conversion
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS original_filename text,
ADD COLUMN IF NOT EXISTS original_file_type text,
ADD COLUMN IF NOT EXISTS original_file_size bigint,
ADD COLUMN IF NOT EXISTS text_content text,
ADD COLUMN IF NOT EXISTS conversion_status text DEFAULT 'pending' CHECK (conversion_status IN ('pending', 'processing', 'completed', 'failed'));

-- Create index for full-text search on text content
CREATE INDEX IF NOT EXISTS idx_files_text_search ON files USING gin(to_tsvector('english', text_content));

-- Create index for conversion status
CREATE INDEX IF NOT EXISTS idx_files_conversion_status ON files(conversion_status);

-- Update comments
COMMENT ON COLUMN files.original_filename IS 'Original filename before text conversion';
COMMENT ON COLUMN files.original_file_type IS 'Original MIME type before conversion to text';
COMMENT ON COLUMN files.original_file_size IS 'Original file size in bytes before conversion';
COMMENT ON COLUMN files.text_content IS 'Extracted text content from the original file';
COMMENT ON COLUMN files.conversion_status IS 'Status of text conversion process';

-- Create a function for full-text search
CREATE OR REPLACE FUNCTION search_files_text(
  search_user_id uuid,
  search_query text,
  search_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  filename text,
  original_filename text,
  title text,
  author text,
  file_type text,
  original_file_type text,
  file_size bigint,
  original_file_size bigint,
  uploaded_at timestamp with time zone,
  conversion_status text,
  text_snippet text,
  search_rank real
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.filename,
    f.original_filename,
    f.title,
    f.author,
    f.file_type,
    f.original_file_type,
    f.file_size,
    f.original_file_size,
    f.uploaded_at,
    f.conversion_status,
    -- Extract snippet around search terms
    ts_headline('english', f.text_content, plainto_tsquery('english', search_query), 
      'MaxWords=50, MinWords=20, MaxFragments=1') as text_snippet,
    ts_rank(to_tsvector('english', f.text_content), plainto_tsquery('english', search_query)) as search_rank
  FROM files f
  WHERE f.user_id = search_user_id
    AND f.conversion_status = 'completed'
    AND to_tsvector('english', f.text_content) @@ plainto_tsquery('english', search_query)
  ORDER BY search_rank DESC, f.uploaded_at DESC
  LIMIT search_limit;
END;
$$;