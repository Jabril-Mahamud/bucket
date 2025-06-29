import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TablesInsert } from '@/lib/supabase/database.types';

export function useFileProgress() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  const supabase = createClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingUpdateRef = useRef<TablesInsert<"file_progress"> | null>(null);
  const lastSuccessfulUpdateRef = useRef<string>('');

  const performUpdate = useCallback(async (update: TablesInsert<"file_progress">) => {
    try {
      setIsUpdating(true);
      setUpdateError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create a unique key for this update to prevent duplicate processing
      const updateKey = `${update.file_id}-${update.progress_percentage}-${update.last_position}`;
      
      // Skip if this is the same as the last successful update
      if (lastSuccessfulUpdateRef.current === updateKey) {
        return;
      }

      const progressData: TablesInsert<"file_progress"> = {
        user_id: user.id,
        file_id: update.file_id,
        progress_percentage: update.progress_percentage,
        last_position: update.last_position,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('file_progress')
        .upsert(progressData, {
          onConflict: 'user_id,file_id'
        });

      if (error) {
        throw error;
      }

      // Mark this update as successful
      lastSuccessfulUpdateRef.current = updateKey;
      setLastUpdateTime(Date.now());
      
    } catch (error) {
      console.error('Error updating file progress:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update progress');
      
      // Retry after a short delay for network errors
      if (error instanceof Error && (
        error.message.includes('network') || 
        error.message.includes('timeout') ||
        error.message.includes('fetch')
      )) {
        setTimeout(() => {
          performUpdate(update);
        }, 2000);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [supabase]);

  const updateProgress = useCallback(async (
    fileId: string, 
    progressPercentage: number, 
    lastPosition: string
  ) => {
    // Validate inputs
    if (!fileId || progressPercentage < 0 || progressPercentage > 100) {
      console.warn('Invalid progress update parameters:', { fileId, progressPercentage, lastPosition });
      return;
    }

    // Round to prevent micro-updates
    const roundedProgress = Math.round(progressPercentage * 100) / 100;
    const roundedPosition = Math.round(parseFloat(lastPosition) * 100) / 100;

    const update: TablesInsert<"file_progress"> = {
      file_id: fileId,
      progress_percentage: roundedProgress,
      last_position: roundedPosition.toString(),
      user_id: '', // Will be set in performUpdate
    };

    // Store the pending update
    pendingUpdateRef.current = update;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce updates - wait 1 second before actually saving
    debounceTimeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current) {
        performUpdate(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    }, 1000);

  }, [performUpdate]);

  // Immediate update without debouncing (for critical moments like completion)
  const updateProgressImmediate = useCallback(async (
    fileId: string, 
    progressPercentage: number, 
    lastPosition: string
  ) => {
    // Clear any pending debounced update
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      pendingUpdateRef.current = null;
    }

    const update: TablesInsert<"file_progress"> = {
      file_id: fileId,
      progress_percentage: Math.round(progressPercentage * 100) / 100,
      last_position: (Math.round(parseFloat(lastPosition) * 100) / 100).toString(),
      user_id: '', // Will be set in performUpdate
    };

    await performUpdate(update);
  }, [performUpdate]);

  return {
    updateProgress,
    updateProgressImmediate,
    isUpdating,
    lastUpdateTime,
    updateError
  };
}