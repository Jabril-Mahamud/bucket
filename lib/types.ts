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

// Bookmark color types
export type BookmarkColor = 
  | 'rose' | 'pink' | 'fuchsia' | 'purple' | 'violet' | 'indigo'
  | 'blue' | 'sky' | 'cyan' | 'teal' | 'emerald' | 'green'
  | 'lime' | 'yellow' | 'amber' | 'orange' | 'red' | 'stone';

export type BookmarkColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

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

// Database function return types (updated with colors)
export type TextBookmarkRange = {
  id: string;
  title: string;
  note: string | null;
  paragraph_num: number;
  character_pos: number;
  text_preview: string | null;
  color: BookmarkColor;
  color_index: BookmarkColorIndex;
  created_at: string;
};

export type AudioBookmarkRange = {
  id: string;
  title: string;
  note: string | null;
  time_position: number;
  end_time_position: number | null;
  text_preview: string | null;
  color: BookmarkColor;
  color_index: BookmarkColorIndex;
  created_at: string;
};

// File bookmarks function return type
export type FileBookmark = {
  id: string;
  title: string;
  note: string | null;
  position_data: BookmarkPositionData;
  text_preview: string | null;
  color: BookmarkColor;
  color_index: BookmarkColorIndex;
  created_at: string;
  updated_at: string;
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
  color?: BookmarkColor; // Optional, will be auto-assigned if not provided
};

export type UpdateBookmarkData = Partial<Omit<CreateBookmarkData, 'file_id'>>;

// Bookmark color utility types
export type BookmarkColorConfig = {
  name: BookmarkColor;
  index: BookmarkColorIndex;
  tailwindClass: string;
  tailwindBorderClass: string;
  tailwindBgClass: string;
  tailwindTextClass: string;
  tailwindRingClass: string;
  hex: string;
};

// Predefined bookmark colors configuration
export const BOOKMARK_COLORS: BookmarkColorConfig[] = [
  { name: 'rose', index: 0, tailwindClass: 'text-rose-600', tailwindBorderClass: 'border-rose-300', tailwindBgClass: 'bg-rose-100', tailwindTextClass: 'text-rose-800', tailwindRingClass: 'ring-rose-500', hex: '#f43f5e' },
  { name: 'pink', index: 1, tailwindClass: 'text-pink-600', tailwindBorderClass: 'border-pink-300', tailwindBgClass: 'bg-pink-100', tailwindTextClass: 'text-pink-800', tailwindRingClass: 'ring-pink-500', hex: '#ec4899' },
  { name: 'fuchsia', index: 2, tailwindClass: 'text-fuchsia-600', tailwindBorderClass: 'border-fuchsia-300', tailwindBgClass: 'bg-fuchsia-100', tailwindTextClass: 'text-fuchsia-800', tailwindRingClass: 'ring-fuchsia-500', hex: '#d946ef' },
  { name: 'purple', index: 3, tailwindClass: 'text-purple-600', tailwindBorderClass: 'border-purple-300', tailwindBgClass: 'bg-purple-100', tailwindTextClass: 'text-purple-800', tailwindRingClass: 'ring-purple-500', hex: '#a855f7' },
  { name: 'violet', index: 4, tailwindClass: 'text-violet-600', tailwindBorderClass: 'border-violet-300', tailwindBgClass: 'bg-violet-100', tailwindTextClass: 'text-violet-800', tailwindRingClass: 'ring-violet-500', hex: '#8b5cf6' },
  { name: 'indigo', index: 5, tailwindClass: 'text-indigo-600', tailwindBorderClass: 'border-indigo-300', tailwindBgClass: 'bg-indigo-100', tailwindTextClass: 'text-indigo-800', tailwindRingClass: 'ring-indigo-500', hex: '#6366f1' },
  { name: 'blue', index: 6, tailwindClass: 'text-blue-600', tailwindBorderClass: 'border-blue-300', tailwindBgClass: 'bg-blue-100', tailwindTextClass: 'text-blue-800', tailwindRingClass: 'ring-blue-500', hex: '#3b82f6' },
  { name: 'sky', index: 7, tailwindClass: 'text-sky-600', tailwindBorderClass: 'border-sky-300', tailwindBgClass: 'bg-sky-100', tailwindTextClass: 'text-sky-800', tailwindRingClass: 'ring-sky-500', hex: '#0ea5e9' },
  { name: 'cyan', index: 8, tailwindClass: 'text-cyan-600', tailwindBorderClass: 'border-cyan-300', tailwindBgClass: 'bg-cyan-100', tailwindTextClass: 'text-cyan-800', tailwindRingClass: 'ring-cyan-500', hex: '#06b6d4' },
  { name: 'teal', index: 9, tailwindClass: 'text-teal-600', tailwindBorderClass: 'border-teal-300', tailwindBgClass: 'bg-teal-100', tailwindTextClass: 'text-teal-800', tailwindRingClass: 'ring-teal-500', hex: '#14b8a6' },
  { name: 'emerald', index: 10, tailwindClass: 'text-emerald-600', tailwindBorderClass: 'border-emerald-300', tailwindBgClass: 'bg-emerald-100', tailwindTextClass: 'text-emerald-800', tailwindRingClass: 'ring-emerald-500', hex: '#10b981' },
  { name: 'green', index: 11, tailwindClass: 'text-green-600', tailwindBorderClass: 'border-green-300', tailwindBgClass: 'bg-green-100', tailwindTextClass: 'text-green-800', tailwindRingClass: 'ring-green-500', hex: '#22c55e' },
  { name: 'lime', index: 12, tailwindClass: 'text-lime-600', tailwindBorderClass: 'border-lime-300', tailwindBgClass: 'bg-lime-100', tailwindTextClass: 'text-lime-800', tailwindRingClass: 'ring-lime-500', hex: '#84cc16' },
  { name: 'yellow', index: 13, tailwindClass: 'text-yellow-600', tailwindBorderClass: 'border-yellow-300', tailwindBgClass: 'bg-yellow-100', tailwindTextClass: 'text-yellow-800', tailwindRingClass: 'ring-yellow-500', hex: '#eab308' },
  { name: 'amber', index: 14, tailwindClass: 'text-amber-600', tailwindBorderClass: 'border-amber-300', tailwindBgClass: 'bg-amber-100', tailwindTextClass: 'text-amber-800', tailwindRingClass: 'ring-amber-500', hex: '#f59e0b' },
  { name: 'orange', index: 15, tailwindClass: 'text-orange-600', tailwindBorderClass: 'border-orange-300', tailwindBgClass: 'bg-orange-100', tailwindTextClass: 'text-orange-800', tailwindRingClass: 'ring-orange-500', hex: '#f97316' },
  { name: 'red', index: 16, tailwindClass: 'text-red-600', tailwindBorderClass: 'border-red-300', tailwindBgClass: 'bg-red-100', tailwindTextClass: 'text-red-800', tailwindRingClass: 'ring-red-500', hex: '#ef4444' },
  { name: 'stone', index: 17, tailwindClass: 'text-stone-600', tailwindBorderClass: 'border-stone-300', tailwindBgClass: 'bg-stone-100', tailwindTextClass: 'text-stone-800', tailwindRingClass: 'ring-stone-500', hex: '#78716c' },
];

// Bookmark color utility functions
export const getBookmarkColor = (colorIndex: BookmarkColorIndex): BookmarkColorConfig => {
  return BOOKMARK_COLORS[colorIndex];
};

export const getBookmarkColorByName = (colorName: BookmarkColor): BookmarkColorConfig => {
  return BOOKMARK_COLORS.find(config => config.name === colorName) || BOOKMARK_COLORS[0];
};

// Bookmark filtering and sorting types
export type BookmarkFilter = {
  fileId?: string;
  type?: 'text' | 'audio' | 'pdf';
  color?: BookmarkColor;
  searchQuery?: string;
};

export type BookmarkSortBy = 'created_at' | 'updated_at' | 'title' | 'position';
export type BookmarkSortOrder = 'asc' | 'desc';

export type BookmarkSort = {
  by: BookmarkSortBy;
  order: BookmarkSortOrder;
};