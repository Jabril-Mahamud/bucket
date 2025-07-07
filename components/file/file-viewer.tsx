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
  FileText,
  BookOpen,
  Headphones,
  BarChart3,
  VolumeX,
  Volume1,
  Bookmark as BookmarkIcon,
  Copy,
  Search,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileWithProgressData,
  DatabaseFile,
  FileProgressData,
} from "@/lib/types";
import { useFileProgress } from "@/hooks/useFileProgress";
import { useBookmarks, Bookmark, CreateBookmarkData } from "@/hooks/useBookmarks";
import { BookmarkDialog } from "@/components/bookmark/bookmark-dialog";
import { BookmarkList } from "@/components/bookmark/bookmark-list";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";

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

// Pastel colors for highlighting
const HIGHLIGHT_COLORS = [
  "bg-blue-200/50", "dark:bg-blue-900/30",
  "bg-green-200/50", "dark:bg-green-900/30",
  "bg-purple-200/50", "dark:bg-purple-900/30",
  "bg-pink-200/50", "dark:bg-pink-900/30",
  "bg-yellow-200/50", "dark:bg-yellow-900/30",
];

// Mobile-Optimized Audio Player
function MobileAudioPlayer({
  audioFile,
  onBookmarkRequest,
  isVisible = true,
  onSeek,
}: {
  audioFile: FileWithProgressData | null;
  onBookmarkRequest: (positionData: CreateBookmarkData['position_data']) => void;
  isVisible?: boolean;
  onSeek?: (time: number) => void;
}) {
  const [state, setState] = useState<AudioState>(initialAudioState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { updateProgress, updateProgressImmediate } = useFileProgress();

  useEffect(() => {
    setState(initialAudioState);
  }, [audioFile?.id]);

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
    }
  };

  const seek = (time: number) => {
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
    if (state.isMuted || state.volume === 0) return <VolumeX className="h-4 w-4" />;
    if (state.volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  // Expose seek function via onSeek prop
  useEffect(() => {
    if (onSeek) {
      onSeek(seek);
    }
  }, [onSeek, seek]);

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
      </div>
    );
  }

  return (
    <div className="bg-background border-b border-border sticky top-0 z-10">
      <audio ref={audioRef} preload="metadata" />
      
      <div className="max-w-4xl mx-auto p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-4">
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

          <div className="flex-1 min-w-0">
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
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(state.currentTime)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
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

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onBookmarkRequest({ type: 'audio', timestamp: state.currentTime })}
              className="h-8 w-8 p-0"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {}}
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextReader({
  fileId,
  fileData,
  relatedAudioFile,
  onConvertToAudio,
  isConverting,
  onBookmarkRequest,
  onNavigateToBookmark,
  bookmarks,
}: {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
  onConvertToAudio: () => void;
  isConverting: boolean;
  onBookmarkRequest: (positionData: CreateBookmarkData['position_data']) => void;
  onNavigateToBookmark: (bookmark: Bookmark) => void;
  bookmarks: Bookmark[];
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  
  const textContainerRef = useRef<HTMLDivElement>(null);

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
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText("");
    }
  };

  const handleAddTextBookmark = () => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim() || !textContainerRef.current) return;

    const selectedStr = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(textContainerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const character = preSelectionRange.toString().length;

    let paragraphIndex = 0;
    const paragraphs = Array.from(textContainerRef.current.querySelectorAll('p'));
    for (let i = 0; i < paragraphs.length; i++) {
      if (range.intersectsNode(paragraphs[i])) {
        paragraphIndex = i;
        break;
      }
    }

    onBookmarkRequest({
      type: 'text',
      character,
      paragraph: paragraphIndex,
      text_preview: selectedStr.substring(0, 100),
    });
  };

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Text copied to clipboard");
    }
  };

  const renderTextContent = useCallback(() => {
    if (!textContent) return <p className="text-muted-foreground">No text content available.</p>;

    const paragraphs = textContent.split('\n\n');
    let currentOffset = 0;

    return paragraphs.map((paragraph, pIndex) => {
      const paragraphContent: React.ReactNode[] = [];
      let lastIndex = 0;

      const textBookmarksInParagraph = bookmarks.filter(b => 
        b.position_data.type === 'text' && b.position_data.paragraph === pIndex
      ).sort((a, b) => (a.position_data.character || 0) - (b.position_data.character || 0));

      // Group overlapping bookmarks or adjust ranges to prevent issues
      const processedHighlights: { start: number; end: number; color: string; id: string }[] = [];

      textBookmarksInParagraph.forEach((bookmark, bIndex) => {
        const { character, text_preview } = bookmark.position_data;
        if (character === undefined || !text_preview) return;

        let highlightStart = character - currentOffset;
        let highlightEnd = highlightStart + text_preview.length;

        // Ensure highlight is within paragraph bounds
        highlightStart = Math.max(0, highlightStart);
        highlightEnd = Math.min(paragraph.length, highlightEnd);

        if (highlightStart >= highlightEnd) return; // Invalid highlight range

        // Check for overlaps and adjust or merge
        let overlapped = false;
        for (let i = 0; i < processedHighlights.length; i++) {
          const existing = processedHighlights[i];
          // If new highlight overlaps with existing one
          if (Math.max(existing.start, highlightStart) < Math.min(existing.end, highlightEnd)) {
            // For simplicity, if overlaps, we'll just use the existing highlight's color and range
            // A more complex solution might merge or split highlights
            overlapped = true;
            break;
          }
        }

        if (!overlapped) {
          const colorClass = HIGHLIGHT_COLORS[bIndex % HIGHLIGHT_COLORS.length];
          processedHighlights.push({ start: highlightStart, end: highlightEnd, color: colorClass, id: bookmark.id });
        }
      });

      processedHighlights.sort((a, b) => a.start - b.start);

      lastIndex = 0;
      processedHighlights.forEach(highlight => {
        if (highlight.start > lastIndex) {
          paragraphContent.push(paragraph.substring(lastIndex, highlight.start));
        }
        paragraphContent.push(
          <span key={`highlight-${highlight.id}`} className={`${highlight.color} rounded px-0.5`}>
            {paragraph.substring(highlight.start, highlight.end)}
          </span>
        );
        lastIndex = highlight.end;
      });

      if (lastIndex < paragraph.length) {
        paragraphContent.push(paragraph.substring(lastIndex));
      }

      currentOffset += paragraph.length + 2; // +2 for the two newlines removed by split('\n\n')

      return (
        <p key={pIndex} className="mb-6 last:mb-0 transition-colors duration-200" id={`paragraph-${pIndex}`}>
          {paragraphContent}
        </p>
      );
    });
  }, [textContent, bookmarks]);

  if (loadingText) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">Loading text...</p>
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

  return (
    <div className="relative">
      <MobileAudioPlayer 
        audioFile={relatedAudioFile || null}
        onBookmarkRequest={onBookmarkRequest}
        isVisible={!!relatedAudioFile}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="mb-6 space-y-4">
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
          
          {!relatedAudioFile && !!(fileData.text_content || textContent) && (
            <Button 
              onClick={onConvertToAudio}
              disabled={isConverting}
              size="sm"
              className="gap-2"
            >
              {isConverting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Create Audio</span>
                </>
              )}
            </Button>
          )}
        </div>

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div 
              ref={textContainerRef}
              className="prose prose-lg dark:prose-invert max-w-none min-h-[70vh] p-4 md:p-8 bg-background border rounded-lg shadow-sm cursor-text"
              style={{
                lineHeight: '1.8',
                fontSize: '18px',
                fontFamily: 'ui-serif, Georgia, serif'
              }}
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
            >
              {renderTextContent()}
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent className="w-56">
            {selectedText && (
              <>
                <ContextMenuItem 
                  onClick={handleAddTextBookmark}
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
      </div>
    </div>
  );
}

function StandaloneAudioPlayer({
  fileId,
  fileData,
  onBookmarkRequest,
  onNavigateToBookmark,
}: {
  fileId: string;
  fileData: FileWithProgressData;
  onBookmarkRequest: (positionData: CreateBookmarkData['position_data']) => void;
  onNavigateToBookmark: (bookmark: Bookmark) => void;
}) {
  const audioPlayerRef = useRef<{ seek: (time: number) => void }>(null);

  const handleNavigate = useCallback((bookmark: Bookmark) => {
    if (bookmark.position_data.type === 'audio' && audioPlayerRef.current) {
      audioPlayerRef.current.seek(bookmark.position_data.timestamp || 0);
    }
    onNavigateToBookmark(bookmark);
  }, [onNavigateToBookmark]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="space-y-6">
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
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <MobileAudioPlayer 
              audioFile={fileData}
              onBookmarkRequest={onBookmarkRequest}
              isVisible={true}
              onSeek={(seekFn) => (audioPlayerRef.current = { seek: seekFn })}
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
    </div>
  );
}

export function FileViewer({ fileId }: { fileId: string }) {
  const [fileData, setFileData] = useState<FileWithProgressData | null>(null);
  const [relatedAudioFile, setRelatedAudioFile] = useState<FileWithProgressData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkPosition, setBookmarkPosition] = useState<CreateBookmarkData['position_data'] | undefined>();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const { convertToSpeech, isLoading: isTtsLoading } = useTTS();
  const { createBookmark, bookmarks } = useBookmarks(fileId); // Get bookmarks from hook
  const textReaderRef = useRef<{ textContainerRef: React.RefObject<HTMLDivElement> }>(null);
  const audioPlayerRef = useRef<{ seek: (time: number) => void }>(null);

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

        if (!formattedFile.file_type.startsWith('audio/')) {
          const baseFilename = formattedFile.filename.replace(/\.[^/.]+$/, '');
          const audioFilename = `${baseFilename} (Audio).mp3`;
          
          const { data: audioFile } = await supabase
            .from("files")
            .select(`*`)
            .eq("filename", audioFilename)
            .eq("user_id", user.id)
            .single();

          if (audioFile) {
            setRelatedAudioFile(audioFile as FileWithProgressData);
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

  const handleBookmarkRequest = (positionData: CreateBookmarkData['position_data']) => {
    setBookmarkPosition(positionData);
    setBookmarkDialogOpen(true);
  };

  const handleSaveBookmark = async (bookmarkData: Omit<CreateBookmarkData, 'file_id'>) => {
    if (!fileId) return;
    await createBookmark({ ...bookmarkData, file_id: fileId });
    toast.success("Bookmark created successfully!");
  };

  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    if (bookmark.position_data.type === 'text' && textReaderRef.current?.textContainerRef.current) {
      const { paragraph } = bookmark.position_data;
      const textContainer = textReaderRef.current.textContainerRef.current;
      if (paragraph !== undefined) {
        const pElements = textContainer.querySelectorAll('p');
        if (pElements[paragraph]) {
          pElements[paragraph].scrollIntoView({ behavior: 'smooth', block: 'center' });
          pElements[paragraph].classList.add('bg-yellow-200/50', 'dark:bg-yellow-900/30');
          setTimeout(() => {
            pElements[paragraph].classList.remove('bg-yellow-200/50', 'dark:bg-yellow-900/30');
          }, 2500);
        }
      }
    } else if (bookmark.position_data.type === 'audio' && audioPlayerRef.current) {
      audioPlayerRef.current.seek(bookmark.position_data.timestamp || 0);
    }
    setBookmarksOpen(false);
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="text-center py-12 px-4">
        <FileText className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">File Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested file could not be located.</p>
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
  const isText = fileData.file_type === "text/plain" || fileData.file_type === "application/epub+zip";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/library">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sheet open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <BookmarkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Bookmarks</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] sm:w-[420px] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">                      
                      <BookmarkIcon className="h-5 w-5" />
                      <span>Bookmarks</span>
                    </SheetTitle>
                    <SheetDescription>
                      Your saved positions in this file.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto">
                    <BookmarkList 
                      fileId={fileId} 
                      onNavigate={handleNavigateToBookmark}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={downloadFile} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <h1 className="text-lg md:text-2xl font-bold tracking-tight line-clamp-2">
              {fileData.filename}
            </h1>
          </div>
        </div>
      </div>

      {isAudio && <StandaloneAudioPlayer fileId={fileId} fileData={fileData} onBookmarkRequest={handleBookmarkRequest} onNavigateToBookmark={handleNavigateToBookmark} />}
      {isText && (
        <TextReader 
          ref={textReaderRef}
          fileId={fileId} 
          fileData={fileData} 
          relatedAudioFile={relatedAudioFile}
          onConvertToAudio={handleConvertToAudio}
          isConverting={isTtsLoading}
          onBookmarkRequest={handleBookmarkRequest}
          onNavigateToBookmark={handleNavigateToBookmark}
          bookmarks={bookmarks}
        />
      )}

      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onSave={handleSaveBookmark}
        positionData={bookmarkPosition}
      />
    </div>
  );
}