import { Tables } from "./supabase/database.types";

// Database table row types (renamed to avoid conflict with browser File type)
export type DatabaseFile = Tables<"files"> & { text_content: string | null; };
export type FileProgress = Tables<"file_progress">;
export type Collection = Tables<"collections">;
export type Tag = Tables<"tags">;
export type ReadingSession = Tables<"reading_sessions">;
export type FileWithProgress = Tables<"files_with_progress">;
export type Bookmark = Tables<"bookmarks">;

// Progress data as queried from the database (partial file_progress)
export type FileProgressData = {
  progress_percentage: number | null;
  last_position: string | null;
};

// Custom composed types for the application
export type FileWithProgressData = DatabaseFile & {
  file_progress?: FileProgressData[] | null;
  progress?: {
    progress_percentage: number;
    last_position: string;
  } | null;
};

export type LibraryFile = FileWithProgressData;

// Bookmark position data types
export type BookmarkPositionData = 
  | {
      type: 'text';
      character: number;
      paragraph?: number;
    }
  | {
      type: 'audio';
      timestamp: number;
      end_timestamp?: number;
    }
  | {
      type: 'pdf';
      page: number;
      x?: number;
      y?: number;
    };

// Database function return types
export type TextBookmarkRange = {
  id: string;
  title: string;
  note: string | null;
  paragraph_num: number;
  character_pos: number;
  text_preview: string | null;
  created_at: string;
};

export type AudioBookmarkRange = {
  id: string;
  title: string;
  note: string | null;
  time_position: number;
  end_time_position: number | null;
  text_preview: string | null;
  created_at: string;
};

// Extended bookmark type with typed position data
export type BookmarkWithPosition = Omit<Bookmark, 'position_data'> & {
  position_data: BookmarkPositionData;
};

// Bookmark creation/update types
export type CreateBookmarkData = {
  file_id: string;
  title: string;
  note?: string;
  position_data: BookmarkPositionData;
  text_preview?: string;
};

export type UpdateBookmarkData = Partial<Omit<CreateBookmarkData, 'file_id'>>;