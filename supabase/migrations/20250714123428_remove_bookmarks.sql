-- Migration: Remove all bookmark functionality (corrected)
-- File: supabase/migrations/20250714123428_remove_bookmarks.sql

-- First, drop all constraints that depend on functions
ALTER TABLE IF EXISTS bookmarks DROP CONSTRAINT IF EXISTS valid_position_data;
ALTER TABLE IF EXISTS bookmarks DROP CONSTRAINT IF EXISTS valid_color;
ALTER TABLE IF EXISTS bookmarks DROP CONSTRAINT IF EXISTS valid_color_index;

-- Drop the triggers
DROP TRIGGER IF EXISTS assign_bookmark_color_trigger ON bookmarks;
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON bookmarks;

-- Drop the bookmarks table (this will automatically drop associated policies and indexes)
DROP TABLE IF EXISTS bookmarks CASCADE;

-- Now drop the functions (order matters - drop dependent functions first)
DROP FUNCTION IF EXISTS assign_bookmark_color();
DROP FUNCTION IF EXISTS update_bookmarks_updated_at();
DROP FUNCTION IF EXISTS generate_bookmark_color(uuid);
DROP FUNCTION IF EXISTS generate_bookmark_color_index(uuid);
DROP FUNCTION IF EXISTS validate_bookmark_position_data(jsonb);
DROP FUNCTION IF EXISTS find_bookmarks_in_text_range(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS find_bookmarks_in_audio_range(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS get_file_bookmarks(uuid, uuid);