// components/file/audio-player.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Loader2, 
  ChevronDown, 
  BookmarkPlus,
  VolumeX,
  Volume1,
  Volume2,
  Clock,
  Scissors
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileWithProgressData, FileBookmark } from "@/lib/types";
import { useFileProgress } from "@/hooks/useFileProgress";
import { BookmarkTooltip } from "@/components/bookmarks/bookmark-tooltip";
import { BookmarkIndicator } from "@/components/bookmarks/bookmark-indicator";

interface AudioState {
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
}

const initialAudioState: AudioState = {
  isLoading: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  error: null,
};

interface AudioPlayerProps {
  audioFile: FileWithProgressData;
  bookmarks?: FileBookmark[];
  onCreateBookmark?: (timestamp: number, endTimestamp?: number) => void;
  onBookmarkClick?: (bookmark: FileBookmark) => void;
  onSeek?: (seekFn: (time: number) => void) => void;
}

export function AudioPlayer({
  audioFile,
  bookmarks = [],
  onCreateBookmark,
  onBookmarkClick,
  onSeek,
}: AudioPlayerProps) {
  const [state, setState] = useState<AudioState>(initialAudioState);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
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
    const handlePause = () => setState((prev) => ({ ...prev, isPlaying: false }));

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
    const clickTime = percentage * state.duration;
    
    if (isSelectingRange && rangeStart === null) {
      // First click - set start time
      setRangeStart(clickTime);
    } else if (isSelectingRange && rangeStart !== null) {
      // Second click - set end time and create range bookmark
      const endTime = clickTime;
      const startTime = Math.min(rangeStart, endTime);
      const finalEndTime = Math.max(rangeStart, endTime);
      
      if (onCreateBookmark) {
        onCreateBookmark(startTime, finalEndTime);
      }
      
      // Reset range selection
      setRangeStart(null);
      setIsSelectingRange(false);
    } else {
      // Normal seek behavior
      seek(clickTime);
    }
  };

  const handleCreateTimestampBookmark = () => {
    if (onCreateBookmark) {
      onCreateBookmark(state.currentTime);
    }
  };

  const handleStartRangeSelection = () => {
    setIsSelectingRange(true);
    setRangeStart(null);
  };

  const handleCancelRangeSelection = () => {
    setIsSelectingRange(false);
    setRangeStart(null);
  };

  // Expose seek function via onSeek prop
  useEffect(() => {
    if (onSeek) {
      onSeek(seek);
    }
  }, [onSeek, seek]);

  if (state.error) {
    return (
      <div className="bg-background border-b border-border p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-destructive">
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

  // Get range bookmarks for visual representation
  const rangeBookmarks = bookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { type: "audio"; timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp !== undefined;
  });

  const pointBookmarks = bookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { type: "audio"; timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp === undefined;
  });

  return (
    <div className="bg-background border border-border rounded-lg">
      <audio ref={audioRef} preload="metadata" />

      <div className="p-3 md:p-4">
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
                className={`w-full bg-secondary rounded-full h-2 md:h-3 cursor-pointer touch-manipulation ${
                  isSelectingRange ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={handleProgressClick}
              >
                {/* Main progress */}
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(state.currentTime / state.duration) * 100}%`,
                  }}
                />

                {/* Range bookmark backgrounds */}
                {rangeBookmarks.map((bookmark) => {
                  const audioData = bookmark.position_data as {
                    type: "audio";
                    timestamp: number;
                    end_timestamp: number;
                  };
                  const startPercent = (audioData.timestamp / state.duration) * 100;
                  const endPercent = (audioData.end_timestamp / state.duration) * 100;
                  
                  return (
                    <div
                      key={`range-${bookmark.id}`}
                      className="absolute top-0 h-full rounded-full opacity-30"
                      style={{
                        left: `${startPercent}%`,
                        width: `${endPercent - startPercent}%`,
                        backgroundColor: `var(--${bookmark.color}-500)`,
                      }}
                    />
                  );
                })}

                {/* Range selection preview */}
                {isSelectingRange && rangeStart !== null && (
                  <div
                    className="absolute top-0 h-full bg-primary/40 rounded-full"
                    style={{
                      left: `${Math.min((rangeStart / state.duration) * 100, (state.currentTime / state.duration) * 100)}%`,
                      width: `${Math.abs((state.currentTime - rangeStart) / state.duration) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Point Bookmark Indicators */}
              {pointBookmarks.map((bookmark) => {
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

              {/* Range bookmark start/end indicators */}
              {rangeBookmarks.map((bookmark) => {
                const audioData = bookmark.position_data as {
                  type: "audio";
                  timestamp: number;
                  end_timestamp: number;
                };
                return (
                  <BookmarkTooltip
                    key={`range-indicator-${bookmark.id}`}
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
                      <div className="flex items-center">
                        <BookmarkIndicator
                          color={bookmark.color}
                          size="sm"
                          variant="icon"
                          className="mt-1"
                        />
                        <div className="w-1 h-4 bg-current opacity-60 mt-1" />
                      </div>
                    </div>
                  </BookmarkTooltip>
                );
              })}

              {/* Range selection start indicator */}
              {isSelectingRange && rangeStart !== null && (
                <div
                  className="absolute top-0 transform -translate-x-1/2"
                  style={{
                    left: `${(rangeStart / state.duration) * 100}%`,
                  }}
                >
                  <div className="w-1 h-6 bg-primary mt-0.5" />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(state.currentTime)}
              </span>
              {isSelectingRange && (
                <span className="text-xs text-primary font-medium">
                  {rangeStart === null 
                    ? "Click to set start time" 
                    : "Click to set end time"
                  }
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Bookmark Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Add bookmark"
                >
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCreateTimestampBookmark}>
                  <Clock className="mr-2 h-4 w-4" />
                  Bookmark Current Time
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isSelectingRange ? (
                  <DropdownMenuItem onClick={handleStartRangeSelection}>
                    <Scissors className="mr-2 h-4 w-4" />
                    Select Time Range
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleCancelRangeSelection}>
                    Cancel Range Selection
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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