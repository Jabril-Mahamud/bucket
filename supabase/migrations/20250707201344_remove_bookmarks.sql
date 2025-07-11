-- Migration: Remove bookmarks functionality
-- File: supabase/migrations/[timestamp]_remove_bookmarks.sql

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_bookmarks_updated_at ON bookmarks;

-- Drop the function
DROP FUNCTION IF EXISTS update_bookmarks_updated_at();

-- Drop the bookmarks table (this will automatically drop associated policies and indexes)
DROP TABLE IF EXISTS bookmarks;