import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Bookmark {
  id: string;
  user_id: string;
  file_id: string;
  title: string;
  note: string | null;
  position_data: {
    type: 'text' | 'audio';
    character?: number;
    paragraph?: number;
    timestamp?: number;
    text_preview?: string;
  };
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateBookmarkData {
  file_id: string;
  title: string;
  note?: string | null;
  position_data: Bookmark['position_data'];
}

export function useBookmarks(fileId?: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const fetchBookmarks = useCallback(async (specificFileId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const targetFileId = specificFileId || fileId;
      if (targetFileId) {
        query = query.eq('file_id', targetFileId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookmarks((data as Bookmark[]) || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
    } finally {
      setLoading(false);
    }
  }, [supabase, fileId]);

  const createBookmark = useCallback(async (bookmarkData: CreateBookmarkData): Promise<Bookmark | null> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          ...bookmarkData
        })
        .select()
        .single();

      if (error) throw error;

      const newBookmark = data as Bookmark;
      setBookmarks(prev => [newBookmark, ...prev].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ));
      return newBookmark;
    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bookmark');
      return null;
    }
  }, [supabase]);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Omit<CreateBookmarkData, 'file_id'>>): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('bookmarks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setBookmarks(prev => prev.map(bookmark => 
        bookmark.id === id 
          ? { ...bookmark, ...updates, updated_at: new Date().toISOString() }
          : bookmark
      ));

      return true;
    } catch (err) {
      console.error('Error updating bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to update bookmark');
      return false;
    }
  }, [supabase]);

  const deleteBookmark = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
      return false;
    }
  }, [supabase]);

  useEffect(() => {
    if (fileId) {
      fetchBookmarks();
    }
  }, [fetchBookmarks, fileId]);

  return {
    bookmarks,
    loading,
    error,
    fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  };
}