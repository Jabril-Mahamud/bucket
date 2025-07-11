// components/bookmarks/bookmarks-list.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkIndicator } from "./bookmark-indicator";
import { BookmarkDialog } from "./bookmark-dialog";
import { FileBookmark, UpdateBookmarkData } from "@/lib/types";
import { formatBookmarkPosition, formatAudioTime, formatAudioDuration } from "@/lib/bookmark-utils";
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  BookmarkPlus,
  Calendar,
  Clock,
  Scissors
} from "lucide-react";
import { toast } from "sonner";

interface BookmarksListProps {
  fileId: string;
  bookmarks: FileBookmark[];
  isLoading?: boolean;
  onBookmarkClick?: (bookmark: FileBookmark) => void;
  onBookmarkUpdate?: (id: string, data: UpdateBookmarkData) => Promise<void>;
  onBookmarkDelete?: (id: string) => Promise<void>;
  onCreateBookmark?: () => void;
}

export function BookmarksList({
  fileId,
  bookmarks,
  isLoading = false,
  onBookmarkClick,
  onBookmarkUpdate,
  onBookmarkDelete,
  onCreateBookmark,
}: BookmarksListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBookmark, setEditingBookmark] = useState<FileBookmark | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter bookmarks based on search query
  const filteredBookmarks = bookmarks.filter(bookmark => 
    bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.text_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort bookmarks by position
  const sortedBookmarks = filteredBookmarks.sort((a, b) => {
    if (a.position_data.type === 'audio' && b.position_data.type === 'audio') {
      return a.position_data.timestamp - b.position_data.timestamp;
    }
    if (a.position_data.type === 'text' && b.position_data.type === 'text') {
      return a.position_data.character - b.position_data.character;
    }
    // Mixed types, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleEditBookmark = (bookmark: FileBookmark) => {
    setEditingBookmark(bookmark);
    setIsEditDialogOpen(true);
  };

  const handleDeleteBookmark = async (bookmark: FileBookmark) => {
    if (!onBookmarkDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the bookmark "${bookmark.title}"?`
    );
    
    if (!confirmed) return;

    try {
      setIsDeleting(bookmark.id);
      await onBookmarkDelete(bookmark.id);
      toast.success("Bookmark deleted successfully");
    } catch (error) {
      toast.error("Failed to delete bookmark");
      console.error("Error deleting bookmark:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateBookmark = async (data: UpdateBookmarkData) => {
    if (!editingBookmark || !onBookmarkUpdate) return;
    
    try {
      await onBookmarkUpdate(editingBookmark.id, data);
      toast.success("Bookmark updated successfully");
    } catch (error) {
      toast.error("Failed to update bookmark");
      console.error("Error updating bookmark:", error);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getBookmarkTypeIcon = (bookmark: FileBookmark) => {
    if (bookmark.position_data.type === 'audio') {
      const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
      return audioData.end_timestamp !== undefined ? <Scissors className="h-3 w-3" /> : <Clock className="h-3 w-3" />;
    }
    return <BookmarkPlus className="h-3 w-3" />;
  };

  const getBookmarkTypeLabel = (bookmark: FileBookmark) => {
    if (bookmark.position_data.type === 'audio') {
      const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
      return audioData.end_timestamp !== undefined ? 'Section' : 'Timestamp';
    }
    return 'Bookmark';
  };

  const getAudioDurationInfo = (bookmark: FileBookmark) => {
    if (bookmark.position_data.type === 'audio') {
      const audioData = bookmark.position_data as { timestamp: number; end_timestamp?: number };
      if (audioData.end_timestamp !== undefined) {
        const duration = audioData.end_timestamp - audioData.timestamp;
        return formatAudioDuration(duration);
      }
    }
    return null;
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4" />
              Bookmarks
            </div>
            <Badge variant="secondary">
              {bookmarks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Bookmark Button */}
          {onCreateBookmark && (
            <Button 
              onClick={onCreateBookmark}
              className="w-full gap-2"
              variant="outline"
            >
              <BookmarkPlus className="h-4 w-4" />
              Add Bookmark
            </Button>
          )}

          {/* Bookmarks List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading bookmarks...</p>
              </div>
            ) : sortedBookmarks.length === 0 ? (
              <div className="text-center py-8">
                <BookmarkPlus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create your first bookmark!'}
                </p>
              </div>
            ) : (
              sortedBookmarks.map((bookmark) => {
                const durationInfo = getAudioDurationInfo(bookmark);
                
                return (
                  <Card 
                    key={bookmark.id} 
                    className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onBookmarkClick?.(bookmark)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <BookmarkIndicator 
                          color={bookmark.color} 
                          size="sm"
                          className="mt-1 flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2">
                            {bookmark.title}
                          </h4>
                          
                          {bookmark.note && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {bookmark.note}
                            </p>
                          )}
                          
                          {bookmark.text_preview && (
                            <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                              &quot;{bookmark.text_preview}&quot;
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {getBookmarkTypeIcon(bookmark)}
                              {formatBookmarkPosition(bookmark.position_data)}
                            </Badge>
                            
                            <Badge variant="secondary" className="text-xs">
                              {getBookmarkTypeLabel(bookmark)}
                            </Badge>
                            
                            {durationInfo && (
                              <Badge variant="outline" className="text-xs text-purple-600 border-purple-600">
                                {durationInfo}
                              </Badge>
                            )}
                            
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(bookmark.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditBookmark(bookmark)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteBookmark(bookmark)}
                            className="text-destructive"
                            disabled={isDeleting === bookmark.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Bookmark Dialog */}
      {editingBookmark && (
        <BookmarkDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          bookmark={editingBookmark}
          fileId={fileId}
          onSave={handleUpdateBookmark}
          isLoading={false}
        />
      )}
    </div>
  );
}