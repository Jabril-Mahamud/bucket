import { Tables } from "./supabase/database.types";

// Database table row types (renamed to avoid conflict with browser File type)
export type DatabaseFile = Tables<"files"> & { text_content: string | null; };
export type FileProgress = Tables<"file_progress">;
export type Collection = Tables<"collections">;
export type Tag = Tables<"tags">;
export type ReadingSession = Tables<"reading_sessions">;
export type FileWithProgress = Tables<"files_with_progress">;

// Progress data as queried from the database (partial file_progress)
export type FileProgressData = {
  progress_percentage: number | null;
  last_position: string | null;
};

// Custom composed types for the application
export type FileWithProgressData = DatabaseFile & {
  file_progress?: FileProgressData[] | null;
  progress?: {
    progress_percentage: number | null;  // Changed from 'number' to 'number | null'
    last_position: string | null;        // Changed from 'string' to 'string | null'
  } | null;
};

export type LibraryFile = FileWithProgressData;