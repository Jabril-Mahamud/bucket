// components/file/audio-viewer.tsx
"use client";

import { useState, useRef, useCallback } from "react";
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
import { FileWithProgressData, BookmarkPositionData, CreateBookmarkData, UpdateBookmarkData, FileBookmark } from "@/lib/types";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { BookmarksList } from "@/components/bookmarks/bookmarks-list";
import {  generateAudioBookmarkPreview } from "@/lib/bookmark-utils";
import { toast } from "sonner";
import { AudioPlayer } from "./audio-player";

interface AudioViewerProps {
  fileData: FileWithProgressData;
}

export function AudioViewer({ fileData }: AudioViewerProps) {
  const audioPlayerRef = useRef<{ seek: (time: number) => void } | null>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  
  // Store bookmark data directly instead of relying on state timing
  const [pendingBookmarkData, setPendingBookmarkData] = useState<{
    positionData: BookmarkPositionData;
    textPreview: string;
  } | null>(null);

  // Bookmarks integration
  const {
    bookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks({ autoLoad: true, fileId: fileData.id });

  // Debug logging
  console.log('AudioViewer - bookmarks loaded:', bookmarks.length);
  console.log('AudioViewer - file ID:', fileData.id);

  // Filter audio bookmarks
  const audioBookmarks = bookmarks.filter(
    (bookmark): bookmark is FileBookmark => bookmark.position_data.type === "audio"
  );

  console.log('AudioViewer - audio bookmarks:', audioBookmarks.length);

  const handleBookmarkUpdate = async (id: string, data: UpdateBookmarkData): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

  // Fixed: Create bookmark data immediately and store it
  const handleCreateBookmark = useCallback((timestamp: number, endTimestamp?: number) => {
    console.log('AudioViewer - Creating bookmark:', { timestamp, endTimestamp });
    
    // Create the position data immediately
    const positionData: BookmarkPositionData = endTimestamp !== undefined 
      ? {
          type: "audio",
          timestamp: timestamp,
          end_timestamp: endTimestamp,
        }
      : {
          type: "audio",
          timestamp: timestamp,
        };

    // Generate preview text immediately
    const textPreview = generateAudioBookmarkPreview(timestamp, endTimestamp);
    
    // Store the data and open dialog
    setPendingBookmarkData({
      positionData,
      textPreview
    });
    
    setIsBookmarkDialogOpen(true);
  }, []);

  const handleBookmarkSave = async (data: CreateBookmarkData | UpdateBookmarkData) => {
    console.log('AudioViewer - Saving bookmark:', data);
    
    if ("file_id" in data) {
      // This is a creation scenario
      try {
        const result = await createBookmark(data as CreateBookmarkData);
        console.log('AudioViewer - Bookmark created:', result);
        
        // Check if it's a range bookmark for better toast message
        const positionData = (data as CreateBookmarkData).position_data;
        const isRange = positionData.type === "audio" && "end_timestamp" in positionData && positionData.end_timestamp !== undefined;
        
        if (isRange) {
          toast.success("Audio section bookmark created successfully");
        } else {
          toast.success("Audio bookmark created successfully");
        }
        
        // Clear pending data
        setPendingBookmarkData(null);
      } catch (error) {
        console.error('AudioViewer - Error creating bookmark:', error);
        toast.error("Failed to create bookmark");
      }
    } else {
      // This is an update scenario (though not used in this component's current flow)
      console.warn("Update scenario not handled in AudioViewer's handleBookmarkSave");
    }
  };

  const handleBookmarkClick = useCallback((bookmark: FileBookmark) => {
    console.log('AudioViewer - Bookmark clicked:', bookmark);
    
    const audioData = bookmark.position_data as BookmarkPositionData;
    if (audioData.type === "audio" && "timestamp" in audioData && audioPlayerRef.current) {
      console.log('AudioViewer - Seeking to:', audioData.timestamp);
      audioPlayerRef.current.seek(audioData.timestamp);
    }
  }, []);

  // Count different types of bookmarks
  const pointBookmarks = audioBookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp === undefined;
  });

  const rangeBookmarks = audioBookmarks.filter(bookmark => {
    const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
    return audioData.end_timestamp !== undefined;
  });

  const handleSeekCallback = useCallback((seekFn: (time: number) => void) => {
    audioPlayerRef.current = { seek: seekFn };
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsBookmarkDialogOpen(false);
    setPendingBookmarkData(null);
  }, []);

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
              onSeek={handleSeekCallback}
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

      {/* Fixed Bookmark Creation Dialog */}
      {pendingBookmarkData && (
        <BookmarkDialog
          open={isBookmarkDialogOpen}
          onOpenChange={handleDialogClose}
          fileId={fileData.id}
          positionData={pendingBookmarkData.positionData}
          textPreview={pendingBookmarkData.textPreview}
          onSave={handleBookmarkSave}
          isLoading={false}
        />
      )}
    </div>
  );
}