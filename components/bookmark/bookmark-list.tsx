// components/bookmark/bookmark-list.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkDialog } from "./bookmark-dialog";
import { Bookmark, useBookmarks } from "@/hooks/useBookmarks";
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
} from "lucide-react";

interface BookmarkListProps {
  fileId: string;
  onNavigateToBookmark?: (bookmark: Bookmark) => void;
}

export function BookmarkList({ fileId, onNavigateToBookmark }: BookmarkListProps) {
  const { bookmarks, loading, deleteBookmark, updateBookmark } = useBookmarks(fileId);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEditBookmark = async (title: string, note?: string) => {
    if (!editingBookmark) return;

    const success = await updateBookmark(editingBookmark.id, {
      title,
      note,
    });

    if (success) {
      setEditingBookmark(null);
    }
  };

  const handleDeleteBookmark = async (bookmark: Bookmark) => {
    if (confirm(`Are you sure you want to delete the bookmark "${bookmark.title}"?`)) {
      await deleteBookmark(bookmark.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPositionText = (bookmark: Bookmark) => {
    const { position_data } = bookmark;
    if (position_data.type === 'text') {
      if (position_data.paragraph !== undefined) {
        return `Paragraph ${position_data.paragraph + 1}`;
      }
      if (position_data.character !== undefined) {
        return `Character ${position_data.character}`;
      }
    } else if (position_data.type === 'audio' && position_data.timestamp !== undefined) {
      const minutes = Math.floor(position_data.timestamp / 60);
      const seconds = Math.floor(position_data.timestamp % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return 'Unknown position';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookmarkIcon className="h-5 w-5" />
            Bookmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedBookmarks = isExpanded ? bookmarks : bookmarks.slice(0, 3);
  const hasMoreBookmarks = bookmarks.length > 3;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <BookmarkIcon className="h-5 w-5" />
              Bookmarks
              {bookmarks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {bookmarks.length}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BookmarkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bookmarks yet</p>
              <p className="text-xs">Right-click on text to add a bookmark</p>
            </div>
          ) : (
            <>
              {displayedBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="group flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <BookmarkIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-1" title={bookmark.title}>
                        {bookmark.title}
                      </h4>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => onNavigateToBookmark?.(bookmark)}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            Go to bookmark
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setEditingBookmark(bookmark)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteBookmark(bookmark)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {bookmark.note && (
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <p className="line-clamp-2">{bookmark.note}</p>
                      </div>
                    )}

                    {bookmark.position_data.text_preview && (
                      <div className="text-xs text-muted-foreground italic line-clamp-1">
                        *{bookmark.position_data.text_preview}*
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{getPositionText(bookmark)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(bookmark.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMoreBookmarks && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show fewer
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show {bookmarks.length - 3} more
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Bookmark Dialog */}
      {editingBookmark && (
        <BookmarkDialog
          open={true}
          onOpenChange={(open) => !open && setEditingBookmark(null)}
          onSave={handleEditBookmark}
          existingBookmark={editingBookmark}
          mode="edit"
        />
      )}
    </>
  );
}