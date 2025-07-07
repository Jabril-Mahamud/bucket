// components/file/file-viewer.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  BookOpen,
  Headphones,
<<<<<<< HEAD
  Clock,
=======
  BarChart3,
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
  VolumeX,
  Volume1,
  Bookmark as BookmarkIcon,
  Copy,
  Search,
  Loader2,
<<<<<<< HEAD
=======
  ChevronDown,
  ChevronUp,
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileWithProgressData,
  DatabaseFile,
  FileProgressData,
} from "@/lib/types";
import { useFileProgress } from "@/hooks/useFileProgress";
import { useBookmarks, Bookmark } from "@/hooks/useBookmarks";
import { BookmarkDialog } from "@/components/bookmark/bookmark-dialog";
import { BookmarkList } from "@/components/bookmark/bookmark-list";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";

<<<<<<< HEAD
interface AudioPlayerProps {
  audioFileId: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onBookmark?: () => void;
  className?: string;
}

// Standalone Audio Player Component
function AudioPlayer({ audioFileId, onTimeUpdate, onBookmark, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { updateProgress, updateProgressImmediate } = useFileProgress();

  // Initialize audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const audioUrl = `/api/files/${audioFileId}`;
    audio.src = audioUrl;
    audio.preload = "metadata";

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
      setError(null);
    };

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current, audio.duration);

      // Save progress every 10 seconds
      if (Math.floor(current) % 10 === 0) {
        updateProgress(audioFileId, (current / audio.duration) * 100, current.toString());
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      updateProgressImmediate(audioFileId, 100, audio.duration.toString());
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setError('Failed to load audio file');
      setLoading(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioFileId, onTimeUpdate, updateProgress, updateProgressImmediate]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
=======
// Centralized Audio State Management
interface AudioState {
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  fileId: string | null;
}

const initialAudioState: AudioState = {
  isLoading: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  error: null,
  fileId: null,
};

// Mobile-Optimized Audio Player
function MobileAudioPlayer({
  audioFile,
  onBookmarkCreate,
  isVisible = true,
}: {
  audioFile: FileWithProgressData | null;
  onBookmarkCreate: (timestamp: number, title: string, note?: string) => void;
  isVisible?: boolean;
}) {
  const [state, setState] = useState<AudioState>(initialAudioState);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { updateProgress, updateProgressImmediate } = useFileProgress();

  // Reset state when audio file changes
  useEffect(() => {
    setState(initialAudioState);
  }, [audioFile?.id]);

  // Audio lifecycle management
  useEffect(() => {
    if (!audioFile || !audioRef.current) {
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return;
    }

    const audio = audioRef.current;
    setState(prev => ({ ...prev, isLoading: true, error: null, fileId: audioFile.id }));

    const timeout = setTimeout(() => {
      setState(prev => prev.isLoading ? { 
        ...prev, 
        isLoading: false, 
        error: "Audio loading timed out" 
      } : prev);
    }, 15000);

    const handleLoadedMetadata = () => {
      clearTimeout(timeout);
      setState(prev => ({
        ...prev,
        isLoading: false,
        duration: audio.duration,
        error: null,
      }));

      if (audioFile.progress?.last_position) {
        const lastTime = parseFloat(audioFile.progress.last_position);
        if (lastTime > 0 && lastTime < audio.duration) {
          audio.currentTime = lastTime;
          setState(prev => ({ ...prev, currentTime: lastTime }));
        }
      }
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
      
      if (Math.floor(audio.currentTime) % 10 === 0) {
        const progressPercentage = (audio.currentTime / audio.duration) * 100;
        updateProgress(audioFile.id, progressPercentage, audio.currentTime.toString());
      }
    };

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));
    
    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      const progressPercentage = (audio.duration / audio.duration) * 100;
      updateProgressImmediate(audioFile.id, progressPercentage, audio.duration.toString());
    };

    const handleError = () => {
      clearTimeout(timeout);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: "Failed to load audio file",
      }));
    };

    const handleCanPlay = () => {
      clearTimeout(timeout);
      setState(prev => ({ ...prev, isLoading: false, error: null }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    audio.src = `/api/files/${audioFile.id}`;
    audio.load();

    return () => {
      clearTimeout(timeout);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, [audioFile, updateProgress, updateProgressImmediate]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (state.isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setState(prev => ({ 
        ...prev, 
        error: "Playback failed",
        isPlaying: false 
      }));
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
    }
  };

  const seek = (time: number) => {
<<<<<<< HEAD
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
    updateProgressImmediate(audioFileId, (time / duration) * 100, time.toString());
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
=======
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
    
    if (audioFile) {
      const progressPercentage = (time / state.duration) * 100;
      updateProgressImmediate(audioFile.id, progressPercentage, time.toString());
    }
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + seconds));
    seek(newTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVolume;
    setState(prev => ({ 
      ...prev, 
      volume: newVolume, 
      isMuted: newVolume === 0 
    }));
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !state.isMuted;
    audioRef.current.volume = newMuted ? 0 : state.volume;
    setState(prev => ({ ...prev, isMuted: newMuted }));
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVolumeIcon = () => {
<<<<<<< HEAD
    if (isMuted || volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[120px] ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading audio...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="text-destructive text-sm">{error}</div>
=======
    if (state.isMuted || state.volume === 0) return <VolumeX className="h-4 w-4" />;
    if (state.volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  if (!audioFile || !isVisible) return null;

  if (state.error) {
    return (
      <div className="bg-background border-b border-border p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <Headphones className="h-4 w-4" />
            <span>Audio Error: {state.error}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setState(prev => ({ ...prev, error: null, isLoading: true }))}
          >
            Retry
          </Button>
        </div>
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className={`space-y-4 ${className}`}>
      <audio ref={audioRef} />
      
      {/* Progress Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground">{formatTime(duration)}</span>
        </div>

        {/* Seek Bar */}
        <div
          className="w-full bg-secondary rounded-full h-3 cursor-pointer hover:h-4 transition-all group relative"
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

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round((currentTime / duration) * 100)}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={() => skip(-10)} className="gap-2">
          <SkipBack className="h-4 w-4" />
          10s
        </Button>

        <Button
          size="lg"
          onClick={togglePlayPause}
          className="h-12 w-12 rounded-full p-0"
          disabled={!duration}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
        </Button>

        <Button variant="outline" size="sm" onClick={() => skip(10)} className="gap-2">
          10s
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Additional Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="flex-shrink-0">
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

        {/* Bookmark Button */}
        {onBookmark && (
          <Button variant="outline" size="sm" onClick={onBookmark} className="gap-2">
            <BookmarkIcon className="h-4 w-4" />
            Bookmark
          </Button>
        )}
      </div>
=======
    <div className="bg-background border-b border-border sticky top-0 z-10">
      <audio ref={audioRef} preload="metadata" />
      
      {/* Mobile-First Player Bar */}
      <div className="max-w-4xl mx-auto p-3 md:p-4">
        {/* Main Controls Row */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Play/Pause Button */}
          <Button
            size="sm"
            onClick={togglePlayPause}
            disabled={state.isLoading}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full p-0 flex-shrink-0"
          >
            {state.isLoading ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : state.isPlaying ? (
              <Pause className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <Play className="h-4 w-4 md:h-5 md:w-5 ml-0.5" />
            )}
          </Button>

          {/* Progress Section - Mobile Optimized */}
          <div className="flex-1 min-w-0">
            {/* Progress Bar */}
            <div
              className="w-full bg-secondary rounded-full h-2 md:h-3 cursor-pointer touch-manipulation"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(percentage * state.duration);
              }}
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
              />
            </div>
            
            {/* Time Display */}
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(state.currentTime)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile: Show fewer controls */}
            <div className="hidden md:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => skip(-10)}
                className="h-8 px-2 text-xs"
              >
                -10s
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => skip(10)}
                className="h-8 px-2 text-xs"
              >
                +10s
              </Button>
            </div>

            {/* Volume (Desktop only) */}
            <div className="hidden md:flex items-center gap-2 w-20">
              <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
                {getVolumeIcon()}
              </Button>
              <div
                className="flex-1 bg-secondary rounded-full h-1.5 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  handleVolumeChange(percentage);
                }}
              >
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${state.isMuted ? 0 : state.volume * 100}%` }}
                />
              </div>
            </div>

            {/* Bookmark */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBookmarkDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>

            {/* Expand/Settings */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded Controls for Mobile */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-border space-y-3">
            {/* Skip Controls for Mobile */}
            <div className="flex items-center justify-center gap-2 md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => skip(-30)}
                className="gap-1"
              >
                <SkipBack className="h-4 w-4" />
                30s
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => skip(-10)}
                className="gap-1"
              >
                10s
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => skip(10)}
                className="gap-1"
              >
                10s
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => skip(30)}
                className="gap-1"
              >
                30s
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume for Mobile */}
            <div className="flex items-center gap-3 md:hidden">
              <Button variant="ghost" size="sm" onClick={toggleMute} className="flex-shrink-0">
                {getVolumeIcon()}
              </Button>
              <div
                className="flex-1 bg-secondary rounded-full h-3 cursor-pointer touch-manipulation"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  handleVolumeChange(percentage);
                }}
              >
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${state.isMuted ? 0 : state.volume * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round((state.isMuted ? 0 : state.volume) * 100)}%
              </span>
            </div>

            {/* File Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Headphones className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Listening to: {audioFile.filename}</span>
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {Math.round((state.currentTime / state.duration) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onSave={async (title, note) => await onBookmarkCreate(state.currentTime, title, note)}
        position={formatTime(state.currentTime)}
      />
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
    </div>
  );
}

<<<<<<< HEAD
// Text + Audio Combined Component
function TextWithAudioViewer({
  fileId,
  textFileData,
  audioFileData,
}: {
  fileId: string;
  textFileData: FileWithProgressData;
  audioFileData?: FileWithProgressData;
=======
// Mobile-Optimized Text Reader
function TextReader({
  fileId,
  fileData,
  relatedAudioFile,
  onConvertToAudio,
  isConverting,
}: {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
  onConvertToAudio: () => void;
  isConverting: boolean;
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<number | null>(null);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
<<<<<<< HEAD
  const [audioBookmarkDialogOpen, setAudioBookmarkDialogOpen] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
=======
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const { createTextBookmark, createAudioBookmark } = useBookmarks(fileId);

<<<<<<< HEAD
  // Load text content
=======
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
  useEffect(() => {
    const fetchTextContent = async () => {
      try {
        setLoadingText(true);
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        setTextContent(text);
      } catch (e) {
        console.error("Error fetching text content:", e);
        setError("Failed to load text content.");
      } finally {
        setLoadingText(false);
      }
    };

    fetchTextContent();
  }, [fileId]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedStr = selection.toString().trim();
      setSelectedText(selectedStr);
      
      const range = selection.getRangeAt(0);
      const textContainer = textContainerRef.current;
      if (textContainer) {
        const beforeRange = document.createRange();
        beforeRange.setStart(textContainer, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const position = beforeRange.toString().length;
        setSelectionPosition(position);
      }
    } else {
      setSelectedText("");
      setSelectionPosition(null);
    }
  };

  const handleAddTextBookmark = async (title: string, note?: string) => {
    if (selectionPosition === null) return;

    const paragraphs = textContent?.split('\n\n') || [];
    let paragraphIndex = 0;
    let charCount = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphLength = paragraphs[i].length + 2;
      if (charCount + paragraphLength > selectionPosition) {
        paragraphIndex = i;
        break;
      }
      charCount += paragraphLength;
    }

    await createTextBookmark(fileId, title, selectionPosition, paragraphIndex, selectedText, note);
  };

  const handleAddAudioBookmark = async (timestamp: number, title: string, note?: string) => {
    await createAudioBookmark(fileId, title, timestamp, note);
  };

  const handleAddAudioBookmark = async (title: string, note?: string) => {
    await createAudioBookmark(fileId, title, currentAudioTime, note);
  };

<<<<<<< HEAD
  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    if (bookmark.position_data.type === 'text') {
      const { paragraph } = bookmark.position_data;
      const textContainer = textContainerRef.current;
      
      if (textContainer && paragraph !== undefined) {
        const paragraphElements = textContainer.querySelectorAll('p');
        if (paragraphElements[paragraph]) {
          paragraphElements[paragraph].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Highlight the paragraph briefly
          paragraphElements[paragraph].classList.add('bg-yellow-200', 'dark:bg-yellow-900/30');
          setTimeout(() => {
            paragraphElements[paragraph].classList.remove('bg-yellow-200', 'dark:bg-yellow-900/30');
          }, 2000);
        }
      }
    }
    // Audio bookmark navigation would need to seek to the timestamp
    // This could be implemented by passing a callback to the audio player
=======
    const { paragraph } = bookmark.position_data;
    const textContainer = textContainerRef.current;
    
    if (textContainer && paragraph !== undefined) {
      const paragraphElements = textContainer.querySelectorAll('p');
      if (paragraphElements[paragraph]) {
        paragraphElements[paragraph].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        paragraphElements[paragraph].classList.add('bg-yellow-200', 'dark:bg-yellow-900/30');
        setTimeout(() => {
          paragraphElements[paragraph].classList.remove('bg-yellow-200', 'dark:bg-yellow-900/30');
        }, 2000);
      }
    }
    
    // Close bookmarks on mobile after navigation
    setBookmarksOpen(false);
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
  }, []);

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Text copied to clipboard");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAudioTimeUpdate = useCallback((currentTime: number, _duration: number) => {
    setCurrentAudioTime(currentTime);
  }, []);

  if (loadingText) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg font-medium">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <Card className="border-2">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <FileText className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold">Error loading content</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canConvertToAudio = !!(fileData.text_content || textContent);

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      {/* Audio Player Section (if available) */}
      {audioFileData && (
        <Card className="border-2 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <Headphones className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  Audio Version
                  <Badge variant="default" className="bg-emerald-600">
                    Listen & Read
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  {audioFileData.filename}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer
              audioFileId={audioFileData.id}
              onTimeUpdate={handleAudioTimeUpdate}
              onBookmark={() => setAudioBookmarkDialogOpen(true)}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Text Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    Text Document
                    <Badge variant="default" className="bg-blue-600">
                      Text
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {textFileData.file_size
                      ? Math.round((textFileData.file_size / 1024) * 100) / 100
                      : 0}{" "}
                    KB
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div 
                    ref={textContainerRef}
                    className="prose dark:prose-invert max-w-none min-h-[600px] max-h-[80vh] overflow-y-auto p-6 border rounded-lg bg-muted/30 cursor-text"
                    onMouseUp={handleTextSelection}
                  >
                    {textContent ? (
                      <div className="text-foreground leading-relaxed text-base">
                        {textContent.split('\n\n').map((paragraph, index) => (
                          <p key={index} className="mb-4 last:mb-0 transition-colors duration-200">
                            {paragraph.trim()}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No text content available.</p>
                    )}
                  </div>
                </ContextMenuTrigger>
                
                <ContextMenuContent className="w-56">
                  {selectedText && (
                    <>
                      <ContextMenuItem 
                        onClick={() => setBookmarkDialogOpen(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <BookmarkIcon className="h-4 w-4" />
                        Add Bookmark
                      </ContextMenuItem>
                      <ContextMenuItem 
                        onClick={handleCopyText}
                        className="gap-2 cursor-pointer"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Text
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  )}
                  <ContextMenuItem className="gap-2 cursor-pointer">
                    <Search className="h-4 w-4" />
                    Search in Document
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>

              {selectedText && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-sm font-medium">Selected:</span>
                  <span className="text-sm text-muted-foreground italic">
                    &quot;{selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}&quot;
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setBookmarkDialogOpen(true)}
                    className="ml-auto gap-1"
                  >
                    <BookmarkIcon className="h-3 w-3" />
                    Bookmark
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
=======
    <div className="relative">
      {/* Audio Player Bar */}
      <MobileAudioPlayer 
        audioFile={relatedAudioFile || null}
        onBookmarkCreate={handleAddAudioBookmark}
        isVisible={!!relatedAudioFile}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Mobile-Optimized Header */}
        <div className="mb-6 space-y-4">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="bg-blue-600">
              <BookOpen className="h-3 w-3 mr-1" />
              Text
            </Badge>
            {relatedAudioFile && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                <Headphones className="h-3 w-3 mr-1" />
                Audio Available
              </Badge>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bookmarks - Mobile Sheet, Desktop Button */}
            <Sheet open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookmarkIcon className="h-4 w-4" />
                  Bookmarks
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Bookmarks</SheetTitle>
                  <SheetDescription>
                    Your saved reading positions and notes
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <BookmarkList 
                    fileId={fileId} 
                    onNavigateToBookmark={handleNavigateToBookmark}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Convert to Audio */}
            {!relatedAudioFile && canConvertToAudio && (
              <Button 
                onClick={onConvertToAudio}
                disabled={isConverting}
                size="sm"
                className="gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Converting...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Audio</span>
                    <span className="sm:hidden">Audio</span>
                  </>
                )}
              </Button>
            )}
          </div>
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
        </div>

        {/* Reading Area - Full Width on Mobile */}
        <div className="space-y-4">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div 
                ref={textContainerRef}
                className="prose prose-lg dark:prose-invert max-w-none min-h-[70vh] p-4 md:p-8 bg-background border rounded-lg shadow-sm cursor-text"
                style={{
                  lineHeight: '1.8',
                  fontSize: window.innerWidth < 768 ? '16px' : '18px',
                  fontFamily: 'ui-serif, Georgia, serif'
                }}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
              >
                {textContent ? (
                  <div className="text-foreground">
                    {textContent.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-6 last:mb-0 transition-colors duration-200">
                        {paragraph.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No text content available.</p>
                )}
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent className="w-56">
              {selectedText && (
                <>
                  <ContextMenuItem 
                    onClick={() => setBookmarkDialogOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    Add Bookmark
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onClick={handleCopyText}
                    className="gap-2 cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Text
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              )}
              <ContextMenuItem className="gap-2 cursor-pointer">
                <Search className="h-4 w-4" />
                Search in Document
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* Selection Indicator - Mobile Optimized */}
          {selectedText && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium flex-shrink-0">Selected:</span>
                  <span className="text-sm text-muted-foreground italic truncate">
                    &quot;{selectedText.length > 40 ? selectedText.substring(0, 40) + '...' : selectedText}&quot;
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setBookmarkDialogOpen(true)}
                  className="gap-1 flex-shrink-0"
                >
                  <BookmarkIcon className="h-3 w-3" />
                  Bookmark
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bookmark Dialogs */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onSave={handleAddTextBookmark}
        selectedText={selectedText}
        position={selectionPosition !== null ? `Character ${selectionPosition}` : undefined}
      />

<<<<<<< HEAD
      <BookmarkDialog
        open={audioBookmarkDialogOpen}
        onOpenChange={setAudioBookmarkDialogOpen}
        onSave={handleAddAudioBookmark}
        position={`${Math.floor(currentAudioTime / 60)}:${Math.floor(currentAudioTime % 60).toString().padStart(2, '0')}`}
      />
=======
// Standalone Audio Player
function StandaloneAudioPlayer({
  fileId,
  fileData,
}: {
  fileId: string;
  fileData: FileWithProgressData;
}) {
  const { createAudioBookmark } = useBookmarks(fileId);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  const handleAddAudioBookmark = async (timestamp: number, title: string, note?: string) => {
    await createAudioBookmark(fileId, title, timestamp, note);
  };

  const handleBookmarkNavigation = useCallback((bookmark: Bookmark) => {
    console.log('Navigating to bookmark:', bookmark);
    setBookmarksOpen(false);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="space-y-6">
        {/* Audio Player Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                  <Headphones className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    Audio Player
                    <Badge variant="default" className="bg-emerald-600">Audio</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {fileData.file_size ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100 : 0} MB
                  </p>
                </div>
              </div>
              
              {/* Bookmarks Button */}
              <Sheet open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <BookmarkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Bookmarks</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Bookmarks</SheetTitle>
                    <SheetDescription>
                      Your saved audio positions and notes
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <BookmarkList 
                      fileId={fileId} 
                      onNavigateToBookmark={handleBookmarkNavigation}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <MobileAudioPlayer 
              audioFile={fileData}
              onBookmarkCreate={handleAddAudioBookmark}
              isVisible={true}
            />

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
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
    </div>
  );
}

// Main File Viewer Component
export function FileViewer({ fileId }: { fileId: string }) {
  const [fileData, setFileData] = useState<FileWithProgressData | null>(null);
  const [relatedAudioFile, setRelatedAudioFile] = useState<FileWithProgressData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { convertToSpeech, isLoading: isTtsLoading } = useTTS();

  const handleConvertToAudio = async () => {
    if (!fileData) {
      toast.error("No file data available.");
      return;
    }

    let textToConvert = fileData.text_content;

    if (!textToConvert && fileData.file_type === 'text/plain') {
      try {
        const response = await fetch(`/api/files/${fileData.id}`);
        if (response.ok) {
          textToConvert = await response.text();
        }
      } catch (error) {
        console.error("Error reading text file:", error);
        toast.error("Failed to read text file");
        return;
      }
    }

    if (!textToConvert || textToConvert.trim().length === 0) {
      toast.error("No text content available to convert to audio.");
      return;
    }

    const toastId = toast.loading("Converting to audio...", {
      description: `File: ${fileData.filename}`,
    });

    try {
      const result = await convertToSpeech(textToConvert, { fileId: fileData.id, autoPlay: false });
      
      if (result.audioFileId) {
        toast.success("Audio conversion complete!", {
          id: toastId,
          description: "The audio file has been created and is ready to play.",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error("Audio conversion failed", {
          id: toastId,
          description: "No audio file was created. Please try again.",
        });
      }
    } catch (error) {
      console.error("TTS conversion error:", error);
      toast.error("Audio conversion failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

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

        if (fileError) throw fileError;

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

        // Look for related audio file
        if (!formattedFile.file_type.startsWith('audio/')) {
          const baseFilename = formattedFile.filename.replace(/\.[^/.]+$/, '');
          const audioFilename = `${baseFilename} (Audio).mp3`;
          
          const { data: audioFile } = await supabase
            .from("files")
            .select(`
              *,
              file_progress (
                progress_percentage,
                last_position
              )
            `)
            .eq("filename", audioFilename)
            .eq("user_id", user.id)
            .single();

          if (audioFile) {
            const audioFileWithProgress = audioFile as DatabaseFile & {
              file_progress: FileProgressData[] | null;
            };

            const formattedAudioFile: FileWithProgressData = {
              ...audioFileWithProgress,
              progress: audioFileWithProgress.file_progress?.[0]
                ? {
                    progress_percentage: audioFileWithProgress.file_progress[0].progress_percentage || 0,
                    last_position: audioFileWithProgress.file_progress[0].last_position || "0",
                  }
                : null,
            };

            setRelatedAudioFile(formattedAudioFile);
          }
        }
      } catch (error) {
        console.error("Error fetching file:", error);
        router.push("/library");
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
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">File not found</h2>
        <p className="text-muted-foreground mb-6">
          The requested file could not be located
        </p>
        <Link href="/library">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const isAudio = fileData.file_type.startsWith("audio/");
  const isText = fileData.file_type === "text/plain";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-Optimized Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <Link href="/library">
                <Button variant="ghost" size="sm" className="gap-2 flex-shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Library</span>
                </Button>
              </Link>
              <div className="text-xs md:text-sm text-muted-foreground truncate">
                {formatDate(fileData.uploaded_at)}
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={downloadFile} className="gap-2 flex-shrink-0">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
<<<<<<< HEAD
          </Link>
          <Button variant="outline" onClick={downloadFile} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          {isText && !relatedAudioFile && (
            <Button 
              variant="outline" 
              onClick={handleConvertToAudio} 
              disabled={isTtsLoading}
              className="gap-2"
            >
              {isTtsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              Convert to Audio
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight line-clamp-2">
            {fileData.filename}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>Uploaded {formatDate(fileData.uploaded_at)}</span>
            <span>•</span>
            <span>
              {fileData.file_size
                ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100
                : 0}{" "}
              MB
            </span>
            {relatedAudioFile && (
              <>
                <span>•</span>
                <span className="text-emerald-600 font-medium">Audio version available</span>
              </>
            )}
=======
          </div>
          
          <div className="mt-2">
            <h1 className="text-lg md:text-2xl font-bold tracking-tight line-clamp-2">
              {fileData.filename}
            </h1>
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
          </div>
        </div>
      </div>

      {/* File Content */}
<<<<<<< HEAD
      {isAudio ? (
        // Standalone Audio Player for audio-only files
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                    <Headphones className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      Audio Player
                      <Badge variant="default" className="bg-emerald-600">
                        Audio
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      {fileData.file_size
                        ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100
                        : 0}{" "}
                      MB
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer audioFileId={fileId} />
              </CardContent>
            </Card>
          </div>
          <div>
            <BookmarkList fileId={fileId} />
          </div>
        </div>
      ) : isText ? (
        // Text with optional audio
        <TextWithAudioViewer
          fileId={fileId}
          textFileData={fileData}
          audioFileData={relatedAudioFile}
        />
      ) : (
        // Fallback for other file types
        <Card className="border-2">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Preview not available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This file type cannot be previewed in the browser. You can download it to view it locally.
            </p>
          </CardContent>
        </Card>
=======
      {isAudio && <StandaloneAudioPlayer fileId={fileId} fileData={fileData} />}
      {isText && (
        <TextReader 
          fileId={fileId} 
          fileData={fileData} 
          relatedAudioFile={relatedAudioFile}
          onConvertToAudio={handleConvertToAudio}
          isConverting={isTtsLoading}
        />
>>>>>>> e0313141e9c63678c13c4bde077ea8bd4c14d1fd
      )}
    </div>
  );
}