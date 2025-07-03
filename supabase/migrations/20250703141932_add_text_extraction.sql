-- Migration: Add text extraction fields to files table
-- File: supabase/migrations/20250703_add_text_extraction.sql

-- Add columns for text extraction
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS extracted_text text,
ADD COLUMN IF NOT EXISTS extraction_status text DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_error text,
ADD COLUMN IF NOT EXISTS word_count integer,
ADD COLUMN IF NOT EXISTS extraction_completed_at timestamp with time zone;

-- Add index for text search
CREATE INDEX IF NOT EXISTS idx_files_extracted_text_gin ON files USING gin(to_tsvector('english', extracted_text));
CREATE INDEX IF NOT EXISTS idx_files_extraction_status ON files(extraction_status);

-- Add comments
COMMENT ON COLUMN files.extracted_text IS 'Full text content extracted from the file';
COMMENT ON COLUMN files.extraction_status IS 'Status of text extraction: pending, processing, completed, failed';
COMMENT ON COLUMN files.extraction_error IS 'Error message if extraction failed';
COMMENT ON COLUMN files.word_count IS 'Number of words in extracted text';
COMMENT ON COLUMN files.extraction_completed_at IS 'When text extraction was completed';

-- Function to update word count when extracted_text changes
CREATE OR REPLACE FUNCTION update_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.extracted_text IS NOT NULL THEN
    NEW.word_count = array_length(string_to_array(NEW.extracted_text, ' '), 1);
  ELSE
    NEW.word_count = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update word count
DROP TRIGGER IF EXISTS trigger_update_word_count ON files;
CREATE TRIGGER trigger_update_word_count
  BEFORE UPDATE OF extracted_text ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_word_count();