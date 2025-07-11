// hooks/useBookmarks.ts
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  CreateBookmarkData, 
  UpdateBookmarkData, 
  FileBookmark, 
  TextBookmarkRange, 
  AudioBookmarkRange,
  BookmarkPositionData,
  BookmarkColor,
  BookmarkColorIndex
} from '@/lib/types';
import { TablesInsert, TablesUpdate } from '@/lib/supabase/database.types';

export interface BookmarkError {
  message: string;
  code?: string;
}

export interface BookmarkOptions {
  autoLoad?: boolean; // Auto-load bookmarks for a file
  fileId?: string; // File ID for auto-loading
}

export function useBookmarks(options: BookmarkOptions = {}) {
  const { autoLoad = false, fileId } = options;
  
  // State
  const [bookmarks, setBookmarks] = useState<FileBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<BookmarkError | null>(null);
  
  const supabase = createClient();

  // Clear error utility
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Create bookmark
  const createBookmark = useCallback(async (data: CreateBookmarkData): Promise<FileBookmark | null> => {
    try {
      setIsCreating(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const bookmarkData: TablesInsert<"bookmarks"> = {
        user_id: user.id,
        file_id: data.file_id,
        title: data.title,
        note: data.note || null,
        position_data: data.position_data,
        text_preview: data.text_preview || null,
        color: data.color || null, // Will be auto-assigned by database trigger
      };

      const { data: newBookmark, error: insertError } = await supabase
        .from('bookmarks')
        .insert(bookmarkData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!newBookmark) {
        throw new Error('Failed to create bookmark');
      }

      // Convert database row to FileBookmark type
      const fileBookmark: FileBookmark = {
        id: newBookmark.id,
        title: newBookmark.title,
        note: newBookmark.note,
        position_data: newBookmark.position_data as BookmarkPositionData,
        text_preview: newBookmark.text_preview,
        color: newBookmark.color! as BookmarkColor,
        color_index: newBookmark.color_index! as BookmarkColorIndex,
        created_at: newBookmark.created_at!,
        updated_at: newBookmark.updated_at!,
      };

      // Update local state if this bookmark belongs to the current file
      if (fileId === data.file_id) {
        setBookmarks(prev => [fileBookmark, ...prev]);
      }

      return fileBookmark;

    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to create bookmark'
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [supabase, fileId]);

  // Update bookmark
  const updateBookmark = useCallback(async (id: string, data: UpdateBookmarkData): Promise<FileBookmark | null> => {
    try {
      setIsUpdating(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: TablesUpdate<"bookmarks"> = {
        ...(data.title && { title: data.title }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.position_data && { position_data: data.position_data }),
        ...(data.text_preview !== undefined && { text_preview: data.text_preview }),
        ...(data.color && { color: data.color }),
      };

      const { data: updatedBookmark, error: updateError } = await supabase
        .from('bookmarks')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedBookmark) {
        throw new Error('Failed to update bookmark');
      }

      // Convert database row to FileBookmark type
      const fileBookmark: FileBookmark = {
        id: updatedBookmark.id,
        title: updatedBookmark.title,
        note: updatedBookmark.note,
        position_data: updatedBookmark.position_data as BookmarkPositionData,
        text_preview: updatedBookmark.text_preview,
        color: updatedBookmark.color! as BookmarkColor,
        color_index: updatedBookmark.color_index! as BookmarkColorIndex,
        created_at: updatedBookmark.created_at!,
        updated_at: updatedBookmark.updated_at!,
      };

      // Update local state
      setBookmarks(prev => prev.map(bookmark => 
        bookmark.id === id ? fileBookmark : bookmark
      ));

      return fileBookmark;

    } catch (err) {
      console.error('Error updating bookmark:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to update bookmark'
      });
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [supabase]);

  // Delete bookmark
  const deleteBookmark = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));

      return true;

    } catch (err) {
      console.error('Error deleting bookmark:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to delete bookmark'
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [supabase]);

  // Get bookmarks for a file
  const getFileBookmarks = useCallback(async (targetFileId: string): Promise<FileBookmark[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: bookmarkData, error: fetchError } = await supabase
        .rpc('get_file_bookmarks', {
          target_user_id: user.id,
          target_file_id: targetFileId
        });

      if (fetchError) {
        throw fetchError;
      }

      const fileBookmarks: FileBookmark[] = (bookmarkData || []).map((bookmark: FileBookmark) => ({
        id: bookmark.id,
        title: bookmark.title,
        note: bookmark.note,
        position_data: bookmark.position_data as BookmarkPositionData,
        text_preview: bookmark.text_preview,
        color: bookmark.color as BookmarkColor,
        color_index: bookmark.color_index as BookmarkColorIndex,
        created_at: bookmark.created_at,
        updated_at: bookmark.updated_at,
      }));

      setBookmarks(fileBookmarks);
      return fileBookmarks;

    } catch (err) {
      console.error('Error fetching file bookmarks:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch bookmarks'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Find bookmarks in text range
  const findTextBookmarks = useCallback(async (
    targetFileId: string,
    startParagraph: number = 0,
    endParagraph: number = 999999
  ): Promise<TextBookmarkRange[]> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: bookmarkData, error: fetchError } = await supabase
        .rpc('find_bookmarks_in_text_range', {
          target_user_id: user.id,
          target_file_id: targetFileId,
          start_paragraph: startParagraph,
          end_paragraph: endParagraph
        });

      if (fetchError) {
        throw fetchError;
      }

      return (bookmarkData || []).map((bookmark: TextBookmarkRange) => ({
        ...bookmark,
        color: bookmark.color as BookmarkColor,
        color_index: bookmark.color_index as BookmarkColorIndex,
      }));

    } catch (err) {
      console.error('Error finding text bookmarks:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to find text bookmarks'
      });
      return [];
    }
  }, [supabase]);

  // Find bookmarks in audio range
  const findAudioBookmarks = useCallback(async (
    targetFileId: string,
    startTime: number = 0,
    endTime: number = 999999
  ): Promise<AudioBookmarkRange[]> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: bookmarkData, error: fetchError } = await supabase
        .rpc('find_bookmarks_in_audio_range', {
          target_user_id: user.id,
          target_file_id: targetFileId,
          start_time: startTime,
          end_time_param: endTime
        });

      if (fetchError) {
        throw fetchError;
      }

      return (bookmarkData || []).map((bookmark: AudioBookmarkRange) => ({
        ...bookmark,
        color: bookmark.color as BookmarkColor,
        color_index: bookmark.color_index as BookmarkColorIndex,
      }));

    } catch (err) {
      console.error('Error finding audio bookmarks:', err);
      setError({
        message: err instanceof Error ? err.message : 'Failed to find audio bookmarks'
      });
      return [];
    }
  }, [supabase]);

  // Auto-load bookmarks when fileId changes
  useEffect(() => {
    if (autoLoad && fileId) {
      getFileBookmarks(fileId);
    }
  }, [autoLoad, fileId, getFileBookmarks]);

  return {
    // State
    bookmarks,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,

    // Actions
    createBookmark,
    updateBookmark,
    deleteBookmark,
    getFileBookmarks,
    findTextBookmarks,
    findAudioBookmarks,
    clearError,
  };
}