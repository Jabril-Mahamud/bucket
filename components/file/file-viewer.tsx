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
  Clock,
  BarChart3,
  VolumeX,
  Volume1,
  Bookmark as BookmarkIcon,
  Copy,
  Search,
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

// Text Viewer Component with Bookmark Support
function TextViewer({
  fileId,
  fileData,
  relatedAudioFile,
}: {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<number | null>(null);
  
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const { createTextBookmark } = useBookmarks(fileId);

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
      
      // Calculate character position
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

  const handleAddBookmark = async (title: string, note?: string) => {
    if (selectionPosition === null) return;

    // Find paragraph index
    const paragraphs = textContent?.split('\n\n') || [];
    let paragraphIndex = 0;
    let charCount = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphLength = paragraphs[i].length + 2; // +2 for \n\n
      if (charCount + paragraphLength > selectionPosition) {
        paragraphIndex = i;
        break;
      }
      charCount += paragraphLength;
    }

    await createTextBookmark(
      fileId,
      title,
      selectionPosition,
      paragraphIndex,
      selectedText,
      note
    );
  };

  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    if (bookmark.position_data.type !== 'text') return;

    const { paragraph } = bookmark.position_data;
    const textContainer = textContainerRef.current;
    
    if (textContainer && paragraph !== undefined) {
      // Find the paragraph element and scroll to it
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
  }, []);

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
    }
  };

  if (loadingText) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg font-medium">Loading text...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-2">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileText className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="text-xl font-semibold">Error loading content</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audio Player for Related Audio File */}
      {relatedAudioFile && (
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
                  {relatedAudioFile.filename}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayerComponent fileId={relatedAudioFile.id} fileData={relatedAudioFile} compact={true} />
          </CardContent>
        </Card>
      )}

      {/* Main Text Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    {fileData.file_size
                      ? Math.round((fileData.file_size / 1024) * 100) / 100
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
        </div>

        {/* Bookmarks Sidebar */}
        <div className="space-y-6">
          <BookmarkList 
            fileId={fileId} 
            onNavigateToBookmark={handleNavigateToBookmark}
          />
        </div>
      </div>

      {/* Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onSave={handleAddBookmark}
        selectedText={selectedText}
        position={selectionPosition !== null ? `Character ${selectionPosition}` : undefined}
      />
    </div>
  );
}

// Compact Audio Player Component
function AudioPlayerComponent({
  fileId,
  fileData,
  compact = false,
}: {
  fileId: string;
  fileData: FileWithProgressData;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  const { updateProgress, updateProgressImmediate } = useFileProgress();
  const { createAudioBookmark } = useBookmarks(fileId);
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);

  const saveProgress = useCallback(
    async (currentTime: number, immediate = false) => {
      try {
        if (!duration || duration === 0) return;

        const progressPercentage = (currentTime / duration) * 100;

        if (immediate) {
          await updateProgressImmediate(
            fileId,
            progressPercentage,
            currentTime.toString()
          );
        } else {
          await updateProgress(
            fileId,
            progressPercentage,
            currentTime.toString()
          );
        }
      } catch (error) {
        console.error("Error saving progress:", error);
      }
    },
    [fileId, duration, updateProgress, updateProgressImmediate]
  );

  const handleAddAudioBookmark = async (title: string, note?: string) => {
    await createAudioBookmark(fileId, title, currentTime, note);
  };

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
        saveProgress(audio.currentTime, false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(audio.duration, true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
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
    saveProgress(time, true);
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
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading audio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={`/api/files/${fileId}`} preload="metadata" />

      {/* Progress Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground">
            {formatTime(duration)}
          </span>
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

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {Math.round((currentTime / duration) * 100)}%
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => skip(-10)}
          className="gap-2"
        >
          <SkipBack className="h-4 w-4" />
          10s
        </Button>

        <Button
          size="lg"
          onClick={togglePlayPause}
          className="h-12 w-12 rounded-full p-0"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-1" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => skip(10)}
          className="gap-2"
        >
          10s
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {!compact && (
        <>
          {/* Bookmark Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setBookmarkDialogOpen(true)}
              className="gap-2"
            >
              <BookmarkIcon className="h-4 w-4" />
              Bookmark Current Position
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
        </>
      )}

      {/* Audio Bookmark Dialog */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        onSave={handleAddAudioBookmark}
        position={`${formatTime(currentTime)}`}
      />
    </div>
  );
}

// Main Audio Player Component (for standalone audio files)
function AudioPlayer({
  fileId,
  fileData,
}: {
  fileId: string;
  fileData: FileWithProgressData;
}) {
  const handleBookmarkNavigation = useCallback((bookmark: Bookmark) => {
    // Additional handling for standalone audio player if needed
    console.log('Navigating to bookmark:', bookmark);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Audio Player */}
      <div className="lg:col-span-2 space-y-6">
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

          <CardContent className="space-y-6">
            <AudioPlayerComponent 
              fileId={fileId} 
              fileData={fileData} 
              compact={false} 
            />

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

      {/* Bookmarks Sidebar */}
      <div className="space-y-6">
        <BookmarkList 
          fileId={fileId} 
          onNavigateToBookmark={handleBookmarkNavigation}
        />
      </div>
    </div>
  );
}

export function FileViewer({ fileId }: { fileId: string }) {
  const [fileData, setFileData] = useState<FileWithProgressData | null>(null);
  const [relatedAudioFile, setRelatedAudioFile] = useState<FileWithProgressData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { convertToSpeech, isLoading: isTtsLoading } = useTTS();

  const handleConvertToAudio = async () => {
    if (!fileData?.text_content) {
      toast.error("No text content available to convert to audio.");
      return;
    }

    const toastId = toast.loading("Starting audio conversion...", {
      description: `File: ${fileData.filename}`,
    });

    try {
      await convertToSpeech(fileData.text_content, { fileId: fileData.id, autoPlay: false });
      toast.success("Conversion complete!", {
        id: toastId,
        description: "The new audio file will be available in your library shortly.",
      });
      // Refresh to show the related audio file
      window.location.reload();
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
        const { data: { user }, } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: file, error: fileError } = await supabase
          .from("files")
          .select(
            `
            *,
            file_progress (
              progress_percentage,
              last_position
            )
          `
          )
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
                progress_percentage:
                  fileWithProgress.file_progress[0].progress_percentage || 0,
                last_position:
                  fileWithProgress.file_progress[0].last_position || "0",
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
            .select(
              `
              *,
              file_progress (
                progress_percentage,
                last_position
              )
            `
            )
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
                    progress_percentage:
                      audioFileWithProgress.file_progress[0].progress_percentage || 0,
                    last_position:
                      audioFileWithProgress.file_progress[0].last_position || "0",
                  }
                : null,
            };

            setRelatedAudioFile(formattedAudioFile);
          } else {
            setRelatedAudioFile(undefined);
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
      alert("Failed to download file");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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
      <div className="text-center py-12">
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
          {fileData.text_content && !relatedAudioFile && (
            <Button 
              variant="outline" 
              onClick={handleConvertToAudio} 
              disabled={isTtsLoading}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
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
          </div>
        </div>
      </div>

      {/* File Viewer */}
      {isAudio && <AudioPlayer fileId={fileId} fileData={fileData} />}
      {isText && <TextViewer fileId={fileId} fileData={fileData} relatedAudioFile={relatedAudioFile} />}
    </div>
  );
}