import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkDialog } from "./bookmark-dialog";
import { Bookmark, useBookmarks, CreateBookmarkData } from "@/hooks/useBookmarks";
import {
  Bookmark as BookmarkIcon,
  MoreVertical,
  Edit3,
  Trash2,
  ArrowUpRight,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface BookmarkListProps {
  fileId: string;
  onNavigate?: (bookmark: Bookmark) => void;
}

export function BookmarkList({ fileId, onNavigate }: BookmarkListProps) {
  const { bookmarks, loading, deleteBookmark, updateBookmark } = useBookmarks(fileId);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdateBookmark = async (bookmarkData: Omit<CreateBookmarkData, 'file_id'>) => {
    if (!editingBookmark) return;
    await updateBookmark(editingBookmark.id, bookmarkData);
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      await deleteBookmark(bookmarkId);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPositionText = (bookmark: Bookmark) => {
    const { position_data } = bookmark;
    if (position_data.type === "text") {
      return `Par. ${position_data.paragraph! + 1}`;
    }
    if (position_data.type === "audio") {
      const minutes = Math.floor(position_data.timestamp! / 60);
      const seconds = Math.floor(position_data.timestamp! % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return "Unknown position";
  };

  const displayedBookmarks = isExpanded ? bookmarks : bookmarks.slice(0, 5);
  const hasMoreBookmarks = bookmarks.length > 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookmarkIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <h3 className="text-md font-semibold">No Bookmarks Yet</h3>
            <p className="text-sm mt-1">
              Create one from the audio player or by selecting text.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group relative rounded-lg border p-3 transition-all hover:bg-muted/50 cursor-pointer"
                onClick={() => onNavigate?.(bookmark)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="font-semibold text-sm line-clamp-2" title={bookmark.title}>
                      {bookmark.title}
                    </h4>

                    {bookmark.note && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-3">{bookmark.note}</p>
                      </div>
                    )}

                    {bookmark.position_data.text_preview && (
                      <blockquote className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 pl-2">
                        {bookmark.position_data.text_preview}
                      </blockquote>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {getPositionText(bookmark)}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDate(bookmark.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onNavigate?.(bookmark); }}
                        className="gap-2 cursor-pointer"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span>Go to Bookmark</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setEditingBookmark(bookmark); }}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDeleteBookmark(bookmark.id); }}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {hasMoreBookmarks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full gap-2 text-muted-foreground hover:text-primary mt-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show {bookmarks.length - 5} More
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {editingBookmark && (
        <BookmarkDialog
          open={!!editingBookmark}
          onOpenChange={(open) => !open && setEditingBookmark(null)}
          onSave={handleUpdateBookmark}
          existingBookmark={editingBookmark}
        />
      )}
    </>
  );
}