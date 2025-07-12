// hooks/useFileData.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FileWithProgressData, DatabaseFile, FileProgressData } from '@/lib/types';

export function useFileData(fileId: string) {
  const [fileData, setFileData] = useState<FileWithProgressData | null>(null);
  const [relatedAudioFile, setRelatedAudioFile] = useState<FileWithProgressData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchFileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Fetch file with progress data - handle the case where no file is found
      const { data: files, error: fileError } = await supabase
        .from("files")
        .select(`
          *,
          file_progress (
            progress_percentage,
            last_position
          )
        `)
        .eq("id", fileId)
        .eq("user_id", user.id);

      if (fileError) {
        console.error("Database error:", fileError);
        setError("Database error occurred");
        return;
      }

      if (!files || files.length === 0) {
        setError("File not found or access denied");
        return;
      }

      const file = files[0];
      const fileWithProgress = file as DatabaseFile & {
        file_progress: FileProgressData[] | null;
      };

      const formattedFile: FileWithProgressData = {
        ...fileWithProgress,
        progress: fileWithProgress.file_progress?.[0]
          ? {
              progress_percentage: fileWithProgress.file_progress[0].progress_percentage || 0,
              last_position: fileWithProgress.file_progress[0].last_position || "0",
            }
          : null,
      };

      setFileData(formattedFile);

      // Look for related audio file if this is not already an audio file
      if (!formattedFile.file_type.startsWith("audio/")) {
        const baseFilename = formattedFile.filename.replace(/\.[^/.]+$/, "");
        const audioFilename = `${baseFilename} (Audio).mp3`;

        const { data: audioFiles } = await supabase
          .from("files")
          .select("*")
          .eq("filename", audioFilename)
          .eq("user_id", user.id);

        if (audioFiles && audioFiles.length > 0) {
          setRelatedAudioFile(audioFiles[0] as FileWithProgressData);
        }
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      setError("Failed to load file data");
    } finally {
      setLoading(false);
    }
  }, [fileId, router, supabase]);

  useEffect(() => {
    fetchFileData();
  }, [fetchFileData]);

  return {
    fileData,
    relatedAudioFile,
    loading,
    error,
    refetch: fetchFileData
  };
}