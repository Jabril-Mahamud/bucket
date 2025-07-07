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
import { Bookmark, CreateBookmarkData } from "@/hooks/useBookmarks";
import { Bookmark as BookmarkIcon, MessageSquare, Loader2 } from "lucide-react";

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bookmarkData: Omit<CreateBookmarkData, 'file_id'>) => Promise<void>;
  existingBookmark?: Bookmark;
  positionData?: CreateBookmarkData['position_data'];
}

export function BookmarkDialog({
  open,
  onOpenChange,
  onSave,
  existingBookmark,
  positionData,
}: BookmarkDialogProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const mode = existingBookmark ? 'edit' : 'create';

  useEffect(() => {
    if (open) {
      setTitle(existingBookmark?.title || "");
      setNote(existingBookmark?.note || "");
    } else {
      // Reset on close
      setTitle("");
      setNote("");
      setIsLoading(false);
    }
  }, [open, existingBookmark]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const saveData: Omit<CreateBookmarkData, 'file_id'> = {
        title: title.trim(),
        note: note.trim() || null,
        ...(mode === 'create' && { position_data: positionData! }),
      };
      await onSave(saveData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bookmark:', error);
      // Optionally show a toast notification for the error
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionText = () => {
    if (!positionData) return null;
    if (positionData.type === 'audio') {
      const minutes = Math.floor(positionData.timestamp! / 60);
      const seconds = Math.floor(positionData.timestamp! % 60);
      return `Audio at ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (positionData.type === 'text') {
      return `Text selection (paragraph ${positionData.paragraph! + 1})`;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5" />
            {mode === 'create' ? 'Add Bookmark' : 'Edit Bookmark'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a bookmark to easily return to this location later.'
              : 'Update the details for your bookmark.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'create' && positionData?.text_preview && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Text</Label>
              <blockquote className="p-3 bg-muted rounded-md text-sm italic text-muted-foreground border-l-2 border-primary">
                {positionData.text_preview}
              </blockquote>
            </div>
          )}

          {mode === 'create' && (
            <div className="text-sm text-muted-foreground font-medium">
              {getPositionText()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Chapter 3 start, Key insight" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Note (optional)
            </Label>
            <Textarea
              id="note"
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            className="gap-2 w-[130px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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