"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Download, 
  Volume2, 
  Pause, 
  Play,
  SkipBack,
  SkipForward,
  FileText,
  ExternalLink,
  BookOpen,
  Headphones,
  Clock,
  BarChart3,
  VolumeX,
  Volume1
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
    window.open(`/api/files/${fileId}`, '_blank');
    setHasViewed(true);
    updateProgress(10, '1');
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
    <div className="space-y-6">
      {/* PDF Info Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                PDF Document
                <Badge variant="destructive">PDF</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {Math.round(fileData.file_size / 1024 / 1024 * 100) / 100} MB
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          {fileData.progress && fileData.progress.progress_percentage > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reading Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(fileData.progress.progress_percentage)}% complete
                </span>
              </div>
              <Progress value={fileData.progress.progress_percentage} className="h-3" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button size="lg" onClick={openInNewTab} className="w-full gap-3 h-12">
              <ExternalLink className="h-5 w-5" />
              Open PDF in New Tab
            </Button>
            
            {hasViewed && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <BarChart3 className="h-4 w-4" />
                Progress updated successfully
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Opens in your browsers built-in PDF viewer with full functionality
          </div>
        </CardContent>
      </Card>

      {/* Embedded PDF Viewer */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Embedded Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] border-2 border-dashed border-muted rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`/api/files/${fileId}`}
              className="w-full h-full"
              title={fileData.filename}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Audio Player Component
function AudioPlayer({ fileId, fileData }: { fileId: string; fileData: FileData }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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
      
      if (Math.floor(audio.currentTime) % 10 === 0) {
        saveProgress(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(audio.duration);
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

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(newTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Headphones className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium">Loading audio...</p>
            <p className="text-sm text-muted-foreground">Preparing your audio file</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src={`/api/files/${fileId}`} preload="metadata" />
      
      {/* Main Audio Player */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <Headphones className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                Audio Player
                <Badge variant="default" className="bg-emerald-600">Audio</Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {formatTime(duration)} • {Math.round(fileData.file_size / 1024 / 1024 * 100) / 100} MB
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(currentTime)}
              </span>
              <span className="text-muted-foreground">{formatTime(duration)}</span>
            </div>
            
            {/* Seek Bar */}
            <div 
              className="w-full bg-secondary rounded-full h-3 cursor-pointer hover:h-4 transition-all group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(percentage * duration);
              }}
            >
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300 relative group-hover:bg-primary/90"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Overall Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round((currentTime / duration) * 100)}%</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => skip(-10)}
              className="gap-2 h-12 px-6"
            >
              <SkipBack className="h-5 w-5" />
              10s
            </Button>
            
            <Button 
              size="lg" 
              onClick={togglePlayPause}
              className="h-14 w-14 rounded-full p-0"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 ml-1" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => skip(10)}
              className="gap-2 h-12 px-6"
            >
              10s
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="flex-shrink-0"
            >
              {getVolumeIcon()}
            </Button>
            <div 
              className="flex-1 bg-secondary rounded-full h-2 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleVolumeChange(percentage);
              }}
            >
              <div 
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Saved Progress Info */}
          {fileData.progress && fileData.progress.progress_percentage > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Last saved progress
                </span>
                <span className="font-medium">
                  {Math.round(fileData.progress.progress_percentage)}%
                </span>
              </div>
            </div>
          )}
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg font-medium">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">File not found</h2>
        <p className="text-muted-foreground mb-6">The requested file could not be located</p>
        <Link href="/library">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const isAudio = fileData.file_type.startsWith('audio/');
  const isPDF = fileData.file_type === 'application/pdf';
  const isEPUB = fileData.file_type === 'application/epub+zip';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Button>
          </Link>
          <Button variant="outline" onClick={downloadFile} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight line-clamp-2">
            {fileData.filename}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>Uploaded {formatDate(fileData.uploaded_at)}</span>
            <span>•</span>
            <span>{Math.round(fileData.file_size / 1024 / 1024 * 100) / 100} MB</span>
          </div>
        </div>
      </div>

      {/* File Viewer */}
      {isAudio && (
        <AudioPlayer fileId={fileId} fileData={fileData} />
      )}
      
      {isPDF && (
        <PDFViewer fileId={fileId} fileData={fileData} />
      )}

      {!isAudio && !isPDF && (
        <Card className="border-2">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              {isEPUB ? (
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              ) : (
                <FileText className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Preview not available</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                This file type is not supported for preview. Download the file to view it on your device.
              </p>
            </div>
            <Button onClick={downloadFile} size="lg" className="gap-2">
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}