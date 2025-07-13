// components/file/viewer/text-viewer.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  BookOpen,
  Headphones,
  Volume2,
  Loader2,
  Copy,
  Search,
  BookmarkPlus,
  List,
  Bookmark,
  Edit,
  Trash2,
} from "lucide-react";
import { FileWithProgressData, BookmarkPositionData, CreateBookmarkData, UpdateBookmarkData, FileBookmark } from "@/lib/types";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTTS } from "@/hooks/useTTS";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { BookmarksList } from "@/components/bookmarks/bookmarks-list";
import { AudioPlayer } from "../audio/audio-player";
import { TextContent } from "../text-content";
import { toast } from "sonner";

interface TextViewerProps {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
  onRefresh: () => void;
}

export function TextViewer({ 
  fileId, 
  fileData, 
  relatedAudioFile, 
  onRefresh 
}: TextViewerProps) {
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [bookmarkPosition, setBookmarkPosition] = useState<BookmarkPositionData | undefined>(undefined);
  const [bookmarkTextPreview, setBookmarkTextPreview] = useState<string>("");
  const [isBookmarksSheetOpen, setIsBookmarksSheetOpen] = useState(false);
  const [clickedBookmark, setClickedBookmark] = useState<FileBookmark | undefined>(undefined);
  const [editingBookmark, setEditingBookmark] = useState<FileBookmark | undefined>(undefined);

  // We'll use this ref to get the actual text content element from TextContent
  const textContentRef = useRef<HTMLDivElement | null>(null);

  // Hooks
  const {
    bookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    isLoading: bookmarksLoading,
  } = useBookmarks({ autoLoad: true, fileId });

  const { convertToSpeech, isLoading: isTtsLoading } = useTTS();

  // Wrapper functions to match BookmarksList interface
  const handleBookmarkUpdate = async (id: string, data: UpdateBookmarkData): Promise<void> => {
    await updateBookmark(id, data);
  };

  const handleBookmarkDelete = async (id: string): Promise<void> => {
    await deleteBookmark(id);
  };

  // Improved text selection handler that works with any text container
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectedText("");
      setSelectedRange(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setSelectedText("");
      setSelectedRange(null);
      return;
    }

    setSelectedText(selectedText);

    // Get the range and calculate character position
    const range = selection.getRangeAt(0);
    
    // Find the text container - either from our ref or by finding the prose container
    let textContainer = textContentRef.current;
    if (!textContainer) {
      // Fallback: find the prose container in the document
      textContainer = document.querySelector('.prose') as HTMLDivElement;
    }

    if (textContainer) {
      try {
        // Create a range from the start of the text container to the start of selection
        const preCaretRange = document.createRange();
        preCaretRange.selectNodeContents(textContainer);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        
        const start = preCaretRange.toString().length;
        const end = start + selectedText.length;

        setSelectedRange({ start, end });
        
        // Debug logging
        console.log('Text selection:', { selectedText, start, end });
      } catch (error) {
        console.error('Error calculating text position:', error);
        // Fallback: use a simple character count
        setSelectedRange({ start: 0, end: selectedText.length });
      }
    } else {
      console.warn('Text container not found, using fallback range');
      // Fallback range
      setSelectedRange({ start: 0, end: selectedText.length });
    }
  }, []);

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Text copied to clipboard");
    }
  };

  const handleCreateBookmark = () => {
    if (!selectedText) {
      toast.error("Please select some text to bookmark");
      return;
    }

    // Use selectedRange if available, otherwise fallback to basic position
    const characterPosition = selectedRange?.start ?? 0;
    
    const positionData: BookmarkPositionData = {
      type: "text",
      character: characterPosition,
      paragraph: Math.floor(characterPosition / 500) + 1, // Simple paragraph calculation
    };

    setBookmarkPosition(positionData);
    setBookmarkTextPreview(selectedText);
    setEditingBookmark(undefined);
    setIsBookmarkDialogOpen(true);
    
    console.log('Creating bookmark:', { positionData, selectedText });
  };

  const handleBookmarkSave = async (data: CreateBookmarkData | UpdateBookmarkData) => {
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
    
    // Clear selection and close dialog
    setSelectedText("");
    setSelectedRange(null);
    setBookmarkTextPreview("");
    setEditingBookmark(undefined);
    
    // Clear the browser text selection
    window.getSelection()?.removeAllRanges();
  };

  const handleBookmarkClick = useCallback(
    (bookmark: FileBookmark) => {
      if (bookmark.position_data?.type === "text") {
        const characterPos = bookmark.position_data.character;
        // Scroll to bookmark position (simplified - you might want more sophisticated scrolling)
        if (textContentRef.current) {
          const element = textContentRef.current;
          // Simple scroll calculation - this could be improved
          const scrollPercentage = Math.min(characterPos / 10000, 1);
          element.scrollTop = scrollPercentage * element.scrollHeight;
        }
      }
    },
    []
  );

  const handleEditBookmark = (bookmark: FileBookmark) => {
    setEditingBookmark(bookmark);
    setBookmarkPosition(bookmark.position_data);
    setBookmarkTextPreview(bookmark.text_preview || "");
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

  const handleConvertToAudio = async () => {
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
          onRefresh();
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

  const findBookmarkAtPosition = (clientX: number, clientY: number): FileBookmark | undefined => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return undefined;

    // Check if the clicked element or its parent has bookmark data
    let currentElement = element as HTMLElement;
    while (currentElement && currentElement !== textContentRef.current) {
      const bookmarkId = currentElement.getAttribute("data-bookmark-id");
      if (bookmarkId) {
        return bookmarks.find((b) => b.id === bookmarkId);
      }
      currentElement = currentElement.parentElement as HTMLElement;
    }
    return undefined;
  };

  // Callback to receive the text content ref from TextContent component
  const handleTextContentRef = useCallback((ref: HTMLDivElement | null) => {
    textContentRef.current = ref;
  }, []);

  return (
    <div className="relative">
      {/* Audio Player */}
      {relatedAudioFile && (
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto p-3 md:p-4">
            <AudioPlayer audioFile={relatedAudioFile} />
          </div>
        </div>
      )}

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
                {!relatedAudioFile && (
                  <Button
                    onClick={handleConvertToAudio}
                    disabled={isTtsLoading}
                    size="sm"
                    className="gap-2"
                  >
                    {isTtsLoading ? (
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

                {/* Manual Bookmark Button */}
                <Button
                  onClick={handleCreateBookmark}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  Add Bookmark
                  {selectedText && <span className="text-xs">({selectedText.length} chars)</span>}
                </Button>
              </div>

              {/* Selection Info */}
              {selectedText && (
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Selected Text</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedText.length} characters
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">
                    &quot;{selectedText}&quot;
                  </p>
                </div>
              )}
            </div>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div>
                  <TextContent
                    fileId={fileId}
                    fileData={fileData}
                    bookmarks={bookmarks}
                    onTextSelection={handleTextSelection}
                    onBookmarkClick={handleBookmarkClick}
                    onContextMenu={(e) => {
                      // Find bookmark at click position
                      const bookmark = findBookmarkAtPosition(e.clientX, e.clientY);
                      setClickedBookmark(bookmark);
                    }}
                    ref={handleTextContentRef}
                  />
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
                      onClick={() => setIsBookmarksSheetOpen(true)}
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
                      onClick={() => setIsBookmarksSheetOpen(true)}
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
        textPreview={bookmarkTextPreview}
        bookmark={editingBookmark}
        onSave={handleBookmarkSave}
        isLoading={false}
      />
    </div>
  );
}