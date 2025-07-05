// components/bookmark/bookmark-dialog.tsx
"use client";

import { useState } from "react";
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
import { Bookmark } from "@/hooks/useBookmarks";
import { Bookmark as BookmarkIcon, MessageSquare } from "lucide-react";

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, note?: string) => Promise<void>;
  selectedText?: string;
  position?: string;
  existingBookmark?: Bookmark;
  mode?: 'create' | 'edit';
}

export function BookmarkDialog({
  open,
  onOpenChange,
  onSave,
  selectedText,
  position,
  existingBookmark,
  mode = 'create'
}: BookmarkDialogProps) {
  const [title, setTitle] = useState(existingBookmark?.title || '');
  const [note, setNote] = useState<string>(existingBookmark?.note ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave(title.trim(), note.trim() || undefined);
      onOpenChange(false);
      
      // Reset form if creating new bookmark
      if (mode === 'create') {
        setTitle('');
        setNote('');
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    
    // Reset form when closing if creating new bookmark
    if (!newOpen && mode === 'create') {
      setTitle('');
      setNote('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5" />
            {mode === 'create' ? 'Add Bookmark' : 'Edit Bookmark'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a bookmark at this location to easily return later.'
              : 'Update your bookmark details.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Show selected text preview if available */}
          {selectedText && mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Text</Label>
              <div className="p-3 bg-muted rounded-md text-sm italic text-muted-foreground border-l-2 border-primary">
                *{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}*
              </div>
            </div>
          )}

          {/* Position info */}
          {position && mode === 'create' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <div className="text-sm text-muted-foreground">
                {position}
              </div>
            </div>
          )}

          {/* Bookmark title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter bookmark title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) {
                  handleSave();
                }
              }}
            />
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Note (optional)
            </Label>
            <Textarea
              id="note"
              placeholder="Add a note about this bookmark..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <BookmarkIcon className="h-4 w-4" />
                {mode === 'create' ? 'Add Bookmark' : 'Update Bookmark'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}