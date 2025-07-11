// components/file/audio-viewer.tsx
"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Headphones, 
  BarChart3, 
  List,
  Bookmark
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FileWithProgressData } from "@/lib/types";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { BookmarksList } from "@/components/bookmarks/bookmarks-list";
import { AudioPlayer } from "./audio-player";
import { toast } from "sonner";

import { FileBookmark, CreateBookmarkData, UpdateBookmarkData, BookmarkPositionData } from "@/lib/types";

interface AudioViewerProps {
  fileData: FileWithProgressData;
}

export function AudioViewer({ fileData }: AudioViewerProps) {
  const audioPlayerRef = useRef<{ seek: (time: number) => void }>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [bookmarkTimestamp, setBookmarkTimestamp] = useState<number>(0);
  const [bookmarkEndTimestamp, setBookmarkEndTimestamp] = useState<number | undefined>(undefined);
  const [bookmarkTextPreview, setBookmarkTextPreview] = useState<string>("");

  // Bookmarks integration
  const {
    bookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks({ autoLoad: true, fileId: fileData.id });

  // Filter audio bookmarks
  const audioBookmarks = bookmarks.filter(
    (bookmark): bookmark is FileBookmark => bookmark.position_data.type === "audio"
  );

  const handleBookmarkUpdate = async (id: string, data: UpdateBookmarkData): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateBookmarkTitle = (startTime: number, endTime?: number) => {
    if (endTime !== undefined) {
      return `Audio Section ${formatTime(startTime)} - ${formatTime(endTime)}`;
    } else {
      return `Audio Bookmark at ${formatTime(startTime)}`;
    }
  };

  const generateBookmarkPreview = (startTime: number, endTime?: number) => {
    if (endTime !== undefined) {
      const duration = endTime - startTime;
      return `${Math.round(duration)}s audio section from ${formatTime(startTime)} to ${formatTime(endTime)}`;
    } else {
      return `Audio bookmark at ${formatTime(startTime)}`;
    }
  };

  const handleCreateBookmark = (timestamp: number, endTimestamp?: number) => {
    setBookmarkTimestamp(timestamp);
    setBookmarkEndTimestamp(endTimestamp);
    setBookmarkTextPreview(generateBookmarkPreview(timestamp, endTimestamp));
    setIsBookmarkDialogOpen(true);
  };

  const handleBookmarkSave = async (data: CreateBookmarkData | UpdateBookmarkData) => {
    if ("file_id" in data) {
      // This is a creation scenario
      await createBookmark(data as CreateBookmarkData);
      
      if (bookmarkEndTimestamp !== undefined) {
        toast.success("Audio section bookmark created successfully");
      } else {
        toast.success("Audio bookmark created successfully");
      }
    } else {
      // This is an update scenario (though not used in this component's current flow)
      console.warn("Update scenario not handled in AudioViewer's handleBookmarkSave");
    }
  };

  const handleBookmarkClick = (bookmark: FileBookmark) => {
    const audioData = bookmark.position_data as BookmarkPositionData;
    if (audioData.type === "audio" && audioData.timestamp && audioPlayerRef.current) {
      audioPlayerRef.current.seek(audioData.timestamp);
    }
  };

  // Generate position data for the bookmark
  const getBookmarkPositionData = (): BookmarkPositionData => {
    if (bookmarkEndTimestamp !== undefined) {
      return {
        type: "audio",
        timestamp: bookmarkTimestamp,
        end_timestamp: bookmarkEndTimestamp,
      };
    } else {
      return {
        type: "audio",
        timestamp: bookmarkTimestamp,
      };
    }
  };

  // Count different types of bookmarks
  const pointBookmarks = audioBookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp === undefined;
  });

  const rangeBookmarks = audioBookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp !== undefined;
  });

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Audio Player</span>
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
                    {rangeBookmarks.length > 0 && (
                      <Badge
                        variant="outline"
                        className="text-purple-600 border-purple-600"
                      >
                        {rangeBookmarks.length} Sections
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {fileData.file_size
                      ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100
                      : 0}{" "}
                    MB
                  </p>
                </div>
              </div>
              
              {/* Bookmarks Sheet */}
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
                      Manage your bookmarks and sections for this audio file
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
            <AudioPlayer
              audioFile={fileData}
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

            {/* Bookmark Summary */}
            {audioBookmarks.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Bookmark className="h-4 w-4" />
                    Bookmark Summary
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{pointBookmarks.length}</span>
                    <span className="text-muted-foreground ml-1">
                      Time {pointBookmarks.length === 1 ? 'Bookmark' : 'Bookmarks'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">{rangeBookmarks.length}</span>
                    <span className="text-muted-foreground ml-1">
                      Audio {rangeBookmarks.length === 1 ? 'Section' : 'Sections'}
                    </span>
                  </div>
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
        positionData={getBookmarkPositionData()}
        textPreview={bookmarkTextPreview}
        onSave={handleBookmarkSave}
        isLoading={false}
      />
    </div>
  );
}