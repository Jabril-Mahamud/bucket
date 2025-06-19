"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteToggleProps {
  fileId: string;
  isFavorite: boolean;
  onToggle: () => void;
  variant?: "star" | "heart";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FavoriteToggle({
  fileId,
  isFavorite,
  onToggle,
  variant = "star",
  size = "md",
  className
}: FavoriteToggleProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      // Update last_accessed_at when favoriting
      const { error } = await supabase
        .from('files')
        .update({ 
          is_favorite: !isFavorite,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (error) throw error;
      onToggle();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const Icon = variant === "heart" ? Heart : Star;
  
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const buttonSizes = {
    sm: "h-6 w-6 p-0",
    md: "h-8 w-8 p-0",
    lg: "h-10 w-10 p-0"
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        buttonSizes[size],
        "transition-all duration-200 hover:scale-110",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite();
      }}
      disabled={loading}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {loading ? (
        <Loader2 className={cn(sizeClasses[size], "animate-spin text-muted-foreground")} />
      ) : (
        <Icon
          className={cn(
            sizeClasses[size],
            "transition-colors duration-200",
            isFavorite 
              ? variant === "heart" 
                ? "text-red-500 fill-red-500" 
                : "text-yellow-500 fill-yellow-500"
              : "text-muted-foreground hover:text-foreground"
          )}
        />
      )}
    </Button>
  );
}