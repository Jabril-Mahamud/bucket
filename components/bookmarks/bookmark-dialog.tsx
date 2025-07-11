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
import { 
  CreateBookmarkData, 
  UpdateBookmarkData, 
  FileBookmark,
  BookmarkPositionData 
} from "@/lib/types";
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
  
  const isEditing = !!bookmark;

  // Initialize form data
  useEffect(() => {
    if (isEditing && bookmark) {
      setTitle(bookmark.title);
      setNote(bookmark.note || "");
    } else if (textPreview) {
      setTitle(generateBookmarkTitle(textPreview));
      setNote("");
    } else {
      setTitle("");
      setNote("");
    }
  }, [isEditing, bookmark, textPreview]);

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      if (isEditing) {
        await onSave({
          title: title.trim(),
          note: note.trim() || undefined,
        });
      } else {
        if (!positionData) return;
        
        await onSave({
          file_id: fileId,
          title: title.trim(),
          note: note.trim() || undefined,
          position_data: positionData,
          text_preview: textPreview,
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
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
              placeholder="Enter bookmark title"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isLoading}>
            {isLoading ? (
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