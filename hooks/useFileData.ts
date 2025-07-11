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

      // Fetch file with progress data
      const { data: file, error: fileError } = await supabase
        .from("files")
        .select(`
          *,
          file_progress (
            progress_percentage,
            last_position
          )
        `)
        .eq("id", fileId)
        .eq("user_id", user.id)
        .single();

      if (fileError) {
        setError("File not found or access denied");
        return;
      }

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

        const { data: audioFile } = await supabase
          .from("files")
          .select("*")
          .eq("filename", audioFilename)
          .eq("user_id", user.id)
          .single();

        if (audioFile) {
          setRelatedAudioFile(audioFile as FileWithProgressData);
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