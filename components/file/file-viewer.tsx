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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Copy,
  Search,
  Loader2,
  ChevronDown,
  Bookmark,
  BookmarkPlus,
  List,
  Trash2,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileWithProgressData,
  DatabaseFile,
  FileProgressData,
  BookmarkPositionData,
  CreateBookmarkData,
  UpdateBookmarkData,
  FileBookmark,
} from "@/lib/types";
import { useFileProgress } from "@/hooks/useFileProgress";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTTS } from "@/hooks/useTTS";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { BookmarkIndicator } from "@/components/bookmarks/bookmark-indicator";
import { BookmarkTooltip } from "@/components/bookmarks/bookmark-tooltip";
import { BookmarksList } from "@/components/bookmarks/bookmarks-list";
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

// Mobile-Optimized Audio Player with Bookmarks
function MobileAudioPlayer({
  audioFile,
  isVisible = true,
  onSeek,
  bookmarks = [],
  onCreateBookmark,
  onBookmarkClick,
}: {
  audioFile: FileWithProgressData | null;
  isVisible?: boolean;
  onSeek?: (seekFn: (time: number) => void) => void;
  bookmarks?: FileBookmark[];
  onCreateBookmark?: (timestamp: number) => void;
  onBookmarkClick?: (bookmark: FileBookmark) => void;
}) {
  const [state, setState] = useState<AudioState>(initialAudioState);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { updateProgress, updateProgressImmediate } = useFileProgress();

  useEffect(() => {
    setState(initialAudioState);
  }, [audioFile?.id]);

  useEffect(() => {
    if (!audioFile || !audioRef.current) {
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
      return;
    }

    const audio = audioRef.current;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      fileId: audioFile.id,
    }));

    const timeout = setTimeout(() => {
      setState((prev) =>
        prev.isLoading
          ? {
              ...prev,
              isLoading: false,
              error: "Audio loading timed out",
            }
          : prev
      );
    }, 15000);

    const handleLoadedMetadata = () => {
      clearTimeout(timeout);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        duration: audio.duration,
        error: null,
      }));

      if (audioFile.progress?.last_position) {
        const lastTime = parseFloat(audioFile.progress.last_position);
        if (lastTime > 0 && lastTime < audio.duration) {
          audio.currentTime = lastTime;
          setState((prev) => ({ ...prev, currentTime: lastTime }));
        }
      }
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));

      if (Math.floor(audio.currentTime) % 10 === 0) {
        const progressPercentage = (audio.currentTime / audio.duration) * 100;
        updateProgress(
          audioFile.id,
          progressPercentage,
          audio.currentTime.toString()
        );
      }
    };

    const handlePlay = () => setState((prev) => ({ ...prev, isPlaying: true }));
    const handlePause = () =>
      setState((prev) => ({ ...prev, isPlaying: false }));

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      const progressPercentage = (audio.duration / audio.duration) * 100;
      updateProgressImmediate(
        audioFile.id,
        progressPercentage,
        audio.duration.toString()
      );
    };

    const handleError = () => {
      clearTimeout(timeout);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: "Failed to load audio file",
      }));
    };

    const handleCanPlay = () => {
      clearTimeout(timeout);
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    audio.src = `/api/files/${audioFile.id}`;
    audio.load();

    return () => {
      clearTimeout(timeout);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.pause();
      audio.src = "";
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
      console.error("Playback error:", err);
      setState((prev) => ({
        ...prev,
        error: "Playback failed",
        isPlaying: false,
      }));
    }
  };

  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));

      if (audioFile) {
        const progressPercentage = (time / state.duration) * 100;
        updateProgressImmediate(
          audioFile.id,
          progressPercentage,
          time.toString()
        );
      }
    },
    [audioFile, state.duration, updateProgressImmediate]
  );

  const skip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(
        0,
        Math.min(state.duration, state.currentTime + seconds)
      );
      seek(newTime);
    },
    [state.duration, state.currentTime, seek]
  );

  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = newVolume;
    setState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !state.isMuted;
    audioRef.current.volume = newMuted ? 0 : state.volume;
    setState((prev) => ({ ...prev, isMuted: newMuted }));
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
    if (state.isMuted || state.volume === 0)
      return <VolumeX className="h-4 w-4" />;
    if (state.volume < 0.5) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * state.duration);
  };

  const handleCreateBookmarkAtPosition = () => {
    if (onCreateBookmark) {
      onCreateBookmark(state.currentTime);
    }
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
            onClick={() =>
              setState((prev) => ({ ...prev, error: null, isLoading: true }))
            }
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
            {/* Progress Bar with Bookmarks */}
            <div className="relative">
              <div
                className="w-full bg-secondary rounded-full h-2 md:h-3 cursor-pointer touch-manipulation"
                onClick={handleProgressClick}
              >
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(state.currentTime / state.duration) * 100}%`,
                  }}
                />
              </div>

              {/* Bookmark Indicators */}
              {bookmarks.map((bookmark) => {
                const audioData = bookmark.position_data as {
                  type: "audio";
                  timestamp: number;
                };
                return (
                  <BookmarkTooltip
                    key={bookmark.id}
                    bookmark={bookmark}
                    onBookmarkClick={onBookmarkClick}
                  >
                    <div
                      className="absolute top-0 transform -translate-x-1/2 cursor-pointer"
                      style={{
                        left: `${
                          (audioData.timestamp / state.duration) * 100
                        }%`,
                      }}
                    >
                      <BookmarkIndicator
                        color={bookmark.color}
                        size="sm"
                        variant="icon"
                        className="mt-1"
                      />
                    </div>
                  </BookmarkTooltip>
                );
              })}
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
            {/* Bookmark Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateBookmarkAtPosition}
              className="h-8 w-8 p-0"
              title="Add bookmark at current position"
            >
              <BookmarkPlus className="h-4 w-4" />
            </Button>

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
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 w-8 p-0"
              >
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
                  style={{
                    width: `${state.isMuted ? 0 : state.volume * 100}%`,
                  }}
                />
              </div>
            </div>

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
}: {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
  onConvertToAudio: () => void;
  isConverting: boolean;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [bookmarkPosition, setBookmarkPosition] = useState<
    BookmarkPositionData | undefined
  >(undefined);
  const [isBookmarksSheetOpen, setIsBookmarksSheetOpen] = useState(false);
  const [clickedBookmark, setClickedBookmark] = useState<
    FileBookmark | undefined
  >(undefined);
  const [editingBookmark, setEditingBookmark] = useState<
    FileBookmark | undefined
  >(undefined);

  const textContainerRef = useRef<HTMLDivElement>(null);

  // Bookmarks integration
  const {
    bookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks({ autoLoad: true, fileId });

  // Wrapper functions to match BookmarksList interface
  const handleBookmarkUpdate = async (
    id: string,
    data: UpdateBookmarkData
  ): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

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
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);

      // Calculate character position for bookmark
      if (textContainerRef.current && textContent) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(textContainerRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        const end = start + selectedText.length;

        setSelectedRange({ start, end });
      }
    } else {
      setSelectedText("");
      setSelectedRange(null);
    }
  };

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Text copied to clipboard");
    }
  };

  const handleCreateBookmark = () => {
    if (!selectedRange || !selectedText || !textContent) return;

    const positionData: BookmarkPositionData = {
      type: "text",
      character: selectedRange.start,
      paragraph: calculateParagraphNumber(textContent, selectedRange.start),
    };

    setBookmarkPosition(positionData);
    setEditingBookmark(undefined);
    setIsBookmarkDialogOpen(true);
  };

  const calculateParagraphNumber = (
    content: string,
    position: number
  ): number => {
    const textBeforePosition = content.substring(0, position);
    const paragraphs = textBeforePosition.split("\n\n");
    return paragraphs.length;
  };

  const handleBookmarkSave = async (
    data: CreateBookmarkData | UpdateBookmarkData
  ) => {
    if ("file_id" in data) {
      // Creating new bookmark
      await createBookmark(data as CreateBookmarkData);
      toast.success("Bookmark created successfully");
    } else {
      // Updating existing bookmark
      if (editingBookmark) {
        await updateBookmark(editingBookmark.id, data);
        toast.success("Bookmark updated successfully");
      }
    }
    setSelectedText("");
    setSelectedRange(null);
    setEditingBookmark(undefined);
  };

  const handleBookmarkClick = useCallback(
    (bookmark: FileBookmark) => {
      if (bookmark.position_data?.type === "text" && textContainerRef.current) {
        const characterPos = bookmark.position_data.character;
        // Scroll to bookmark position (simplified - you might want more sophisticated scrolling)
        const element = textContainerRef.current;
        element.scrollTop =
          (characterPos / (textContent?.length || 1)) * element.scrollHeight;
      }
    },
    [textContent]
  );

  // Helper function to find bookmark at current click position
  const findBookmarkAtPosition = (
    clientX: number,
    clientY: number
  ): FileBookmark | undefined => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return undefined;

    // Check if the clicked element or its parent has bookmark data
    let currentElement = element as HTMLElement;
    while (currentElement && currentElement !== textContainerRef.current) {
      const bookmarkId = currentElement.getAttribute("data-bookmark-id");
      if (bookmarkId) {
        return bookmarks.find((b) => b.id === bookmarkId);
      }
      currentElement = currentElement.parentElement as HTMLElement;
    }
    return undefined;
  };

  const handleEditBookmark = (bookmark: FileBookmark) => {
    setEditingBookmark(bookmark);
    setBookmarkPosition(bookmark.position_data);
    setSelectedText(bookmark.text_preview || "");
    setIsBookmarkDialogOpen(true);
  };

  const handleDeleteBookmark = async (bookmark: FileBookmark) => {
    try {
      await deleteBookmark(bookmark.id);
      toast.success("Bookmark deleted successfully");
    } catch {
      toast.error("Failed to delete bookmark");
    }
  };

  const handleOpenBookmarksSheet = () => {
    setIsBookmarksSheetOpen(true);
  };

  const renderTextContentWithBookmarks = useCallback(() => {
    if (!textContent)
      return (
        <p className="text-muted-foreground">No text content available.</p>
      );

    // Get text bookmarks and sort by character position
    const textBookmarks = bookmarks
      .filter((bookmark) => bookmark.position_data.type === "text")
      .sort((a, b) => {
        const aPos = (a.position_data as { character: number }).character;
        const bPos = (b.position_data as { character: number }).character;
        return aPos - bPos;
      });

    if (textBookmarks.length === 0) {
      // No bookmarks, render normally
      const paragraphs = textContent.split("\n\n");
      return (
        <div className="space-y-6">
          {paragraphs.map((paragraph, pIndex) => (
            <p
              key={pIndex}
              className="mb-6 last:mb-0 transition-colors duration-200"
              id={`paragraph-${pIndex}`}
            >
              {paragraph}
            </p>
          ))}
        </div>
      );
    }

    // Render text with highlighted bookmarks
    let currentPos = 0;
    const elements: React.ReactNode[] = [];
    let elementKey = 0;

    textBookmarks.forEach((bookmark) => {
      const startPos = (bookmark.position_data as { character: number })
        .character;
      const endPos = startPos + (bookmark.text_preview?.length || 50); // Fallback length

      // Add text before bookmark
      if (startPos > currentPos) {
        const textBefore = textContent.slice(currentPos, startPos);
        elements.push(<span key={`text-${elementKey++}`}>{textBefore}</span>);
      }

      // Add highlighted bookmark text
      const bookmarkText = textContent.slice(
        startPos,
        Math.min(endPos, textContent.length)
      );
      if (bookmarkText) {
        elements.push(
          <BookmarkTooltip
            key={`bookmark-${bookmark.id}`}
            bookmark={bookmark}
            onBookmarkClick={handleBookmarkClick}
          >
            <span
              data-bookmark-id={bookmark.id}
              className={`cursor-pointer transition-all duration-200 hover:opacity-80 px-1 py-0.5 rounded-sm bg-${bookmark.color}-100 border-b-2 border-${bookmark.color}-400 text-${bookmark.color}-900`}
              onClick={() => handleBookmarkClick(bookmark)}
            >
              {bookmarkText}
            </span>
          </BookmarkTooltip>
        );
      }

      currentPos = Math.max(currentPos, endPos);
    });

    // Add remaining text after last bookmark
    if (currentPos < textContent.length) {
      const remainingText = textContent.slice(currentPos);
      elements.push(<span key={`text-${elementKey++}`}>{remainingText}</span>);
    }

    // Split into paragraphs while preserving highlights
    const result: React.ReactNode[] = [];
    let currentParagraph: React.ReactNode[] = [];
    let paragraphKey = 0;

    elements.forEach((element) => {
      if (typeof element === "string") {
        const paragraphs = element.split("\n\n");
        paragraphs.forEach((paragraph, index) => {
          if (index > 0) {
            // Start new paragraph
            result.push(
              <p
                key={`paragraph-${paragraphKey++}`}
                className="mb-6 last:mb-0 transition-colors duration-200"
              >
                {currentParagraph}
              </p>
            );
            currentParagraph = [];
          }
          if (paragraph) {
            currentParagraph.push(paragraph);
          }
        });
      } else {
        currentParagraph.push(element);
      }
    });

    // Add final paragraph
    if (currentParagraph.length > 0) {
      result.push(
        <p
          key={`paragraph-${paragraphKey++}`}
          className="mb-6 last:mb-0 transition-colors duration-200"
        >
          {currentParagraph}
        </p>
      );
    }

    return <div className="space-y-6">{result}</div>;
  }, [textContent, bookmarks, handleBookmarkClick]);

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
        isVisible={!!relatedAudioFile}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="bg-blue-600">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Text
                </Badge>
                {relatedAudioFile && (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-600"
                  >
                    <Headphones className="h-3 w-3 mr-1" />
                    Audio Available
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-600"
                >
                  <Bookmark className="h-3 w-3 mr-1" />
                  {bookmarks.length} Bookmarks
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {!relatedAudioFile &&
                  !!(fileData.text_content || textContent) && (
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

                {/* Bookmarks Sheet Trigger */}
                <Sheet
                  open={isBookmarksSheetOpen}
                  onOpenChange={setIsBookmarksSheetOpen}
                >
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <List className="h-4 w-4" />
                      Bookmarks ({bookmarks.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-96">
                    <SheetHeader>
                      <SheetTitle>Bookmarks</SheetTitle>
                      <SheetDescription>
                        Manage your bookmarks for this document
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <BookmarksList
                        fileId={fileId}
                        bookmarks={bookmarks}
                        isLoading={bookmarksLoading}
                        onBookmarkClick={handleBookmarkClick}
                        onBookmarkUpdate={handleBookmarkUpdate}
                        onBookmarkDelete={handleBookmarkDelete}
                        onCreateBookmark={handleCreateBookmark}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  ref={textContainerRef}
                  className="prose prose-lg dark:prose-invert max-w-none min-h-[70vh] p-4 md:p-8 bg-background border rounded-lg shadow-sm cursor-text"
                  style={{
                    lineHeight: "1.8",
                    fontSize: "18px",
                    fontFamily: "ui-serif, Georgia, serif",
                  }}
                  onMouseUp={handleTextSelection}
                  onTouchEnd={handleTextSelection}
                  onContextMenu={(e) => {
                    // Find bookmark at click position
                    const bookmark = findBookmarkAtPosition(
                      e.clientX,
                      e.clientY
                    );
                    setClickedBookmark(bookmark);
                  }}
                >
                  {renderTextContentWithBookmarks()}
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-64">
                {/* Bookmark-specific actions when right-clicking on a bookmark */}
                {clickedBookmark && (
                  <>
                    <ContextMenuItem
                      onClick={() => handleEditBookmark(clickedBookmark)}
                      className="gap-2 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Bookmark
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleDeleteBookmark(clickedBookmark)}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Bookmark
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={handleOpenBookmarksSheet}
                      className="gap-2 cursor-pointer"
                    >
                      <List className="h-4 w-4" />
                      View All Bookmarks
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}

                {/* Text selection actions */}
                {selectedText && (
                  <>
                    <ContextMenuItem
                      onClick={handleCopyText}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Text
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={handleCreateBookmark}
                      className="gap-2 cursor-pointer"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      Add Bookmark
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}

                {/* General actions */}
                <ContextMenuItem className="gap-2 cursor-pointer">
                  <Search className="h-4 w-4" />
                  Search in Document
                </ContextMenuItem>

                {/* Show bookmarks sheet if no other actions are available */}
                {!selectedText && !clickedBookmark && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={handleOpenBookmarksSheet}
                      className="gap-2 cursor-pointer"
                    >
                      <List className="h-4 w-4" />
                      View Bookmarks ({bookmarks.length})
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>
      </div>

      {/* Bookmark Creation/Edit Dialog */}
      <BookmarkDialog
        open={isBookmarkDialogOpen}
        onOpenChange={setIsBookmarkDialogOpen}
        fileId={fileId}
        positionData={bookmarkPosition}
        textPreview={selectedText}
        bookmark={editingBookmark}
        onSave={handleBookmarkSave}
        isLoading={false}
      />
    </div>
  );
}

function StandaloneAudioPlayer({
  fileData,
}: {
  fileData: FileWithProgressData;
}) {
  const audioPlayerRef = useRef<{ seek: (time: number) => void }>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [bookmarkTimestamp, setBookmarkTimestamp] = useState<number>(0);

  // Bookmarks integration
  const {
    bookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks({ autoLoad: true, fileId: fileData.id });

  // Filter audio bookmarks from all bookmarks
  const audioBookmarks = bookmarks.filter(
    (bookmark) => bookmark.position_data.type === "audio"
  );

  // Wrapper functions to match BookmarksList interface
  const handleBookmarkUpdate = async (
    id: string,
    data: UpdateBookmarkData
  ): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

  const handleCreateBookmark = (timestamp: number) => {
    setBookmarkTimestamp(timestamp);
    setIsBookmarkDialogOpen(true);
  };

  const handleBookmarkSave = async (
    data: CreateBookmarkData | UpdateBookmarkData
  ) => {
    if ("file_id" in data) {
      // Creating new bookmark
      await createBookmark(data as CreateBookmarkData);
      toast.success("Bookmark created successfully");
    }
  };

  const handleBookmarkClick = (bookmark: FileBookmark) => {
    const audioData = bookmark.position_data as {
      type: "audio";
      timestamp: number;
    };
    if (audioData.timestamp && audioPlayerRef.current) {
      audioPlayerRef.current.seek(audioData.timestamp);
    }
  };

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
                    <Badge variant="default" className="bg-emerald-600">
                      Audio
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-600"
                    >
                      <Bookmark className="h-3 w-3 mr-1" />
                      {audioBookmarks.length} Bookmarks
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {fileData.file_size
                      ? Math.round((fileData.file_size / 1024 / 1024) * 100) /
                        100
                      : 0}{" "}
                    MB
                  </p>
                </div>
              </div>
              {/* Bookmarks Sheet Trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <List className="h-4 w-4" />
                    Bookmarks
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-96">
                  <SheetHeader>
                    <SheetTitle>Audio Bookmarks</SheetTitle>
                    <SheetDescription>
                      Manage your bookmarks for this audio file
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <BookmarksList
                      fileId={fileData.id}
                      bookmarks={audioBookmarks}
                      isLoading={bookmarksLoading}
                      onBookmarkClick={handleBookmarkClick}
                      onBookmarkUpdate={handleBookmarkUpdate}
                      onBookmarkDelete={handleBookmarkDelete}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <MobileAudioPlayer
              audioFile={fileData}
              isVisible={true}
              bookmarks={audioBookmarks}
              onCreateBookmark={handleCreateBookmark}
              onBookmarkClick={handleBookmarkClick}
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

      {/* Bookmark Creation Dialog */}
      <BookmarkDialog
        open={isBookmarkDialogOpen}
        onOpenChange={setIsBookmarkDialogOpen}
        fileId={fileData.id}
        positionData={{
          type: "audio",
          timestamp: bookmarkTimestamp,
        }}
        onSave={handleBookmarkSave}
        isLoading={false}
      />
    </div>
  );
}

export function FileViewer({ fileId }: { fileId: string }) {
  const [fileData, setFileData] = useState<FileWithProgressData | null>(null);
  const [relatedAudioFile, setRelatedAudioFile] = useState<
    FileWithProgressData | undefined
  >(undefined);
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

    if (!textToConvert && fileData.file_type === "text/plain") {
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
      const result = await convertToSpeech(textToConvert, {
        fileId: fileData.id,
        autoPlay: false,
      });

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
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

        if (!formattedFile.file_type.startsWith("audio/")) {
          const baseFilename = formattedFile.filename.replace(/\.[^/.]+$/, "");
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
        <p className="text-muted-foreground mb-6">
          The requested file could not be located.
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
  const isText =
    fileData.file_type === "text/plain" ||
    fileData.file_type === "application/epub+zip";

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
              <Button
                variant="outline"
                size="sm"
                onClick={downloadFile}
                className="gap-2"
              >
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

      {isAudio && <StandaloneAudioPlayer fileData={fileData} />}
      {isText && (
        <TextReader
          fileId={fileId}
          fileData={fileData}
          relatedAudioFile={relatedAudioFile}
          onConvertToAudio={handleConvertToAudio}
          isConverting={isTtsLoading}
        />
      )}
    </div>
  );
}
