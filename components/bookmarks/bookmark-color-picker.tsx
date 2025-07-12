// components/bookmarks/bookmark-color-picker.tsx
"use client";

import { BookmarkColor, BookmarkColorIndex, BOOKMARK_COLORS } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { BookmarkIndicator } from "./bookmark-indicator";
import { cn } from "@/lib/utils";

interface BookmarkColorPickerProps {
  selectedColor?: BookmarkColor;
  onColorChange: (color: BookmarkColor, colorIndex: BookmarkColorIndex) => void;
  className?: string;
}

export function BookmarkColorPicker({
  selectedColor,
  onColorChange,
  className,
}: BookmarkColorPickerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Bookmark Color</Label>
      <div className="grid grid-cols-6 gap-2">
        {BOOKMARK_COLORS.map((colorConfig) => {
          const isSelected = selectedColor === colorConfig.name;
          
          return (
            <button
              key={colorConfig.name}
              type="button"
              onClick={() => onColorChange(colorConfig.name, colorConfig.index)}
              className={cn(
                "group relative p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
              title={`${colorConfig.name} color`}
            >
              <div className="flex items-center justify-center">
                <BookmarkIndicator
                  color={colorConfig.name}
                  size="md"
                  variant="dot"
                  className={cn(
                    "transition-all duration-200",
                    isSelected && "scale-110",
                    !isSelected && "group-hover:scale-110"
                  )}
                />
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background">
                  <div className="w-full h-full rounded-full bg-primary" />
                </div>
              )}
              
              {/* Color name tooltip on hover */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {colorConfig.name}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Selected color preview */}
      {selectedColor && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <BookmarkIndicator color={selectedColor} size="sm" />
          <div className="text-sm">
            <span className="font-medium">Selected: </span>
            <span className="capitalize">{selectedColor}</span>
          </div>
        </div>
      )}
    </div>
  );
}