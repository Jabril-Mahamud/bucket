// components/bookmarks/bookmark-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkIndicator } from "./bookmark-indicator";
import { BookmarkColorPicker } from "./bookmark-color-picker";
import { 
  CreateBookmarkData, 
  UpdateBookmarkData, 
  FileBookmark,
  BookmarkPositionData,
  BookmarkColor,
  BookmarkColorIndex
} from "@/lib/types";
import { generateBookmarkTitle, formatBookmarkPosition } from "@/lib/bookmark-utils";
import { Loader2, Bookmark } from "lucide-react";

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark?: FileBookmark; // If provided, this is an edit dialog
  fileId: string;
  positionData?: BookmarkPositionData;
  textPreview?: string;
  onSave: (data: CreateBookmarkData | UpdateBookmarkData) => Promise<void>;
  isLoading?: boolean;
}

export function BookmarkDialog({
  open,
  onOpenChange,
  bookmark,
  fileId,
  positionData,
  textPreview,
  onSave,
  isLoading = false,
}: BookmarkDialogProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedColor, setSelectedColor] = useState<BookmarkColor | undefined>(undefined);
  const [selectedColorIndex, setSelectedColorIndex] = useState<BookmarkColorIndex | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditing = !!bookmark;

  // Debug logging
  useEffect(() => {
    console.log('BookmarkDialog - props:', { 
      open, 
      isEditing, 
      bookmark: bookmark?.id, 
      fileId, 
      positionData, 
      textPreview 
    });
  }, [open, isEditing, bookmark, fileId, positionData, textPreview]);

  // Initialize form data
  useEffect(() => {
    if (isEditing && bookmark) {
      console.log('BookmarkDialog - Editing bookmark:', bookmark);
      setTitle(bookmark.title);
      setNote(bookmark.note || "");
      setSelectedColor(bookmark.color);
      setSelectedColorIndex(bookmark.color_index);
    } else if (textPreview) {
      console.log('BookmarkDialog - Creating new bookmark with preview:', textPreview);
      setTitle(generateBookmarkTitle(textPreview));
      setNote("");
      setSelectedColor(undefined); // Let the database auto-assign
      setSelectedColorIndex(undefined);
    } else {
      console.log('BookmarkDialog - Creating new bookmark without preview');
      setTitle("");
      setNote("");
      setSelectedColor(undefined);
      setSelectedColorIndex(undefined);
    }
  }, [isEditing, bookmark, textPreview]);

  const handleColorChange = (color: BookmarkColor, colorIndex: BookmarkColorIndex) => {
    setSelectedColor(color);
    setSelectedColorIndex(colorIndex);
  };

  const handleSave = async () => {
    const finalTitle = title.trim() || getDefaultTitle();
    
    if (!finalTitle) {
      console.warn('BookmarkDialog - No title provided');
      return;
    }

    try {
      setIsSaving(true);
      
      if (isEditing) {
        console.log('BookmarkDialog - Updating bookmark');
        await onSave({
          title: finalTitle,
          note: note.trim() || undefined,
          color: selectedColor,
        });
      } else {
        if (!positionData) {
          console.error('BookmarkDialog - No position data for new bookmark');
          return;
        }
        
        console.log('BookmarkDialog - Creating new bookmark:', {
          file_id: fileId,
          title: finalTitle,
          note: note.trim() || undefined,
          position_data: positionData,
          text_preview: textPreview,
          color: selectedColor,
        });
        
        await onSave({
          file_id: fileId,
          title: finalTitle,
          note: note.trim() || undefined,
          position_data: positionData,
          text_preview: textPreview,
          color: selectedColor, // Include the selected color
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('BookmarkDialog - Error saving bookmark:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Generate a default title for audio bookmarks if none exists
  const getDefaultTitle = () => {
    if (title) return title;
    
    if (positionData?.type === 'audio') {
      const audioData = positionData as { timestamp: number; end_timestamp?: number };
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      };
      
      if (audioData.end_timestamp !== undefined) {
        return `Audio Section ${formatTime(audioData.timestamp)} - ${formatTime(audioData.end_timestamp)}`;
      } else {
        return `Audio Bookmark at ${formatTime(audioData.timestamp)}`;
      }
    }
    
    return generateBookmarkTitle(textPreview || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <BookmarkIndicator color={bookmark.color} size="sm" />
                Edit Bookmark
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                Add Bookmark
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your bookmark details"
              : "Create a new bookmark at this position"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Position Display */}
          {(positionData || bookmark?.position_data) && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Position</p>
              <p className="text-sm text-muted-foreground">
                {formatBookmarkPosition(positionData || bookmark!.position_data)}
              </p>
            </div>
          )}

          {/* Text Preview */}
          {(textPreview || bookmark?.text_preview) && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Preview</p>
              <p className="text-sm text-muted-foreground italic">
                &quot;{textPreview || bookmark!.text_preview}&quot;
              </p>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="bookmark-title">Title</Label>
            <Input
              id="bookmark-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getDefaultTitle()}
              maxLength={200}
            />
          </div>

          {/* Note Input */}
          <div className="space-y-2">
            <Label htmlFor="bookmark-note">Note (optional)</Label>
            <Textarea
              id="bookmark-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this bookmark"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Color Picker */}
          <BookmarkColorPicker
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving || isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={(!title.trim() && !getDefaultTitle()) || isSaving || isLoading}>
            {(isSaving || isLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-4 w-4" />
                {isEditing ? "Update" : "Save"} Bookmark
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}