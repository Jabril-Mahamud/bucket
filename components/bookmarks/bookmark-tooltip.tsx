// components/bookmarks/bookmark-tooltip.tsx
"use client";

import { FileBookmark } from "@/lib/types";
import { formatBookmarkPosition } from "@/lib/bookmark-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookmarkIndicator } from "./bookmark-indicator";

interface BookmarkTooltipProps {
  bookmark: FileBookmark;
  children?: React.ReactNode;
  onBookmarkClick?: (bookmark: FileBookmark) => void;
}

export function BookmarkTooltip({ 
  bookmark, 
  children, 
  onBookmarkClick 
}: BookmarkTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <BookmarkIndicator
              color={bookmark.color}
              onClick={() => onBookmarkClick?.(bookmark)}
            />
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookmarkIndicator color={bookmark.color} size="sm" />
              <p className="font-medium text-sm">{bookmark.title}</p>
            </div>
            
            {bookmark.note && (
              <p className="text-xs text-muted-foreground">
                {bookmark.note}
              </p>
            )}
            
            {bookmark.text_preview && (
              <p className="text-xs text-muted-foreground italic">
                &quot;{bookmark.text_preview}&quot;
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              {formatBookmarkPosition(bookmark.position_data)}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}