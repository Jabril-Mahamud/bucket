"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Download, 
  Volume2, 
  Pause, 
  Play,
  SkipBack,
  SkipForward,
  FileText,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FileData {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  progress?: {
    progress_percentage: number;
    last_position: string;
  };
}

// PDF Viewer Component
function PDFViewer({ fileId, fileData }: { fileId: string; fileData: FileData }) {
  const [hasViewed, setHasViewed] = useState(false);

  const openInNewTab = () => {
    // Open PDF in new tab using our API route
    window.open(`/api/files/${fileId}`, '_blank');
    setHasViewed(true);
    
    // Update progress to show it was viewed
    updateProgress(10, '1'); // Basic progress tracking
  };

  const updateProgress = async (percentage: number, position: string) => {
    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          progress_percentage: percentage, 
          last_position: position 
        })
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* PDF Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Click below to open the PDF in a new tab with your browsers built-in viewer.
            </p>
            
            {fileData.progress && fileData.progress.progress_percentage > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(fileData.progress.progress_percentage)}%</span>
                </div>
                <Progress value={fileData.progress.progress_percentage} className="h-2" />
              </div>
            )}

            <Button size="lg" onClick={openInNewTab} className="w-full max-w-md">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open PDF in New Tab
            </Button>

            {hasViewed && (
              <p className="text-sm text-green-600">
                ✓ PDF opened - progress updated
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Embedded PDF Option */}
      <Card>
        <CardHeader>
          <CardTitle>Embedded Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 border rounded-lg overflow-hidden">
            <iframe
              src={`/api/files/${fileId}`}
              className="w-full h-full"
              title={fileData.filename}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Audio Player Component
function AudioPlayer({ fileId, fileData }: { fileId: string; fileData: FileData }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  const saveProgress = useCallback(async (currentTime: number) => {
    try {
      if (!duration) return;

      const progressPercentage = (currentTime / duration) * 100;

      await fetch(`/api/files/${fileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_percentage: progressPercentage,
          last_position: currentTime.toString()
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [fileId, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
      
      // Load last position if available
      if (fileData.progress?.last_position) {
        const lastTime = parseFloat(fileData.progress.last_position);
        if (lastTime > 0 && lastTime < audio.duration) {
          audio.currentTime = lastTime;
          setCurrentTime(lastTime);
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Save progress every 10 seconds
      if (Math.floor(audio.currentTime) % 10 === 0) {
        saveProgress(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(audio.duration); // Mark as completed
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [fileData.progress, saveProgress]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
    saveProgress(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading audio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={`/api/files/${fileId}`} preload="metadata" />
      
      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div 
              className="w-full bg-muted rounded-full h-3 cursor-pointer hover:h-4 transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(percentage * duration);
              }}
            >
              <div 
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seek(Math.max(0, currentTime - 10))}
            >
              <SkipBack className="h-4 w-4" />
              10s
            </Button>
            
            <Button size="lg" onClick={togglePlayPause}>
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => seek(Math.min(duration, currentTime + 10))}
            >
              10s
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Info */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              Progress: {Math.round((currentTime / duration) * 100)}%
            </div>
            {fileData.progress && (
              <div className="text-xs text-muted-foreground mt-1">
                Last saved: {Math.round(fileData.progress.progress_percentage)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FileViewer({ fileId }: { fileId: string }) {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Fetch file metadata
        const { data: file, error: fileError } = await supabase
          .from('files')
          .select(`
            *,
            file_progress (
              progress_percentage,
              last_position
            )
          `)
          .eq('id', fileId)
          .eq('user_id', user.id)
          .single();

        if (fileError) throw fileError;

        const formattedFile = {
          ...file,
          progress: file.file_progress?.[0] || null
        };

        setFileData(formattedFile);
      } catch (error) {
        console.error('Error fetching file:', error);
        router.push('/library');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileId, router, supabase]);

  const downloadFile = async () => {
    if (!fileData) return;

    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading file...</p>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">File not found</p>
        <Link href="/library">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const isAudio = fileData.file_type.startsWith('audio/');
  const isPDF = fileData.file_type === 'application/pdf';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{fileData.filename}</h1>
            <p className="text-muted-foreground">
              {isAudio && <Volume2 className="h-4 w-4 inline mr-1" />}
              {isPDF && <FileText className="h-4 w-4 inline mr-1" />}
              {fileData.file_type} • {Math.round(fileData.file_size / 1024 / 1024 * 100) / 100} MB
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadFile}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* File Viewer */}
      {isAudio && (
        <AudioPlayer fileId={fileId} fileData={fileData} />
      )}
      
      {isPDF && (
        <PDFViewer fileId={fileId} fileData={fileData} />
      )}

      {!isAudio && !isPDF && (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
            <p className="text-muted-foreground mb-4">
              This file type is not supported for preview. You can download it to view on your device.
            </p>
            <Button onClick={downloadFile}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}