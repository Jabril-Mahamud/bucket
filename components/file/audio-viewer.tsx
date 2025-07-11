// components/file/audio-viewer.tsx
"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Headphones, 
  BarChart3, 
  BookmarkPlus, 
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

interface AudioViewerProps {
  fileData: FileWithProgressData;
}

export function AudioViewer({ fileData }: AudioViewerProps) {
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

  // Filter audio bookmarks
  const audioBookmarks = bookmarks.filter(
    (bookmark) => bookmark.position_data.type === "audio"
  );

  const handleBookmarkUpdate = async (id: string, data: any): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

  const handleCreateBookmark = (timestamp: number) => {
    setBookmarkTimestamp(timestamp);
    setIsBookmarkDialogOpen(true);
  };

  const handleBookmarkSave = async (data: any) => {
    if ("file_id" in data) {
      await createBookmark(data);
      toast.success("Bookmark created successfully");
    }
  };

  const handleBookmarkClick = (bookmark: any) => {
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