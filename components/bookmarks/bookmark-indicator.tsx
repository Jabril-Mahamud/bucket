// components/bookmarks/bookmark-indicator.tsx
"use client";

import { cn } from "@/lib/utils";
import { BookmarkColor, BookmarkColorIndex, getBookmarkColor, getBookmarkColorByName } from "@/lib/types";
import { Bookmark } from "lucide-react";

interface BookmarkIndicatorProps {
  color: BookmarkColor | BookmarkColorIndex;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dot' | 'icon';
  className?: string;
  onClick?: () => void;
}

// Static color mapping to ensure Tailwind classes are included in build
const colorStyles = {
  rose: {
    dot: 'bg-rose-100 hover:bg-rose-200 border-rose-400 hover:border-rose-500',
    icon: 'text-rose-600 fill-rose-300 hover:text-rose-700',
  },
  pink: {
    dot: 'bg-pink-100 hover:bg-pink-200 border-pink-400 hover:border-pink-500',
    icon: 'text-pink-600 fill-pink-300 hover:text-pink-700',
  },
  fuchsia: {
    dot: 'bg-fuchsia-100 hover:bg-fuchsia-200 border-fuchsia-400 hover:border-fuchsia-500',
    icon: 'text-fuchsia-600 fill-fuchsia-300 hover:text-fuchsia-700',
  },
  purple: {
    dot: 'bg-purple-100 hover:bg-purple-200 border-purple-400 hover:border-purple-500',
    icon: 'text-purple-600 fill-purple-300 hover:text-purple-700',
  },
  violet: {
    dot: 'bg-violet-100 hover:bg-violet-200 border-violet-400 hover:border-violet-500',
    icon: 'text-violet-600 fill-violet-300 hover:text-violet-700',
  },
  indigo: {
    dot: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-400 hover:border-indigo-500',
    icon: 'text-indigo-600 fill-indigo-300 hover:text-indigo-700',
  },
  blue: {
    dot: 'bg-blue-100 hover:bg-blue-200 border-blue-400 hover:border-blue-500',
    icon: 'text-blue-600 fill-blue-300 hover:text-blue-700',
  },
  sky: {
    dot: 'bg-sky-100 hover:bg-sky-200 border-sky-400 hover:border-sky-500',
    icon: 'text-sky-600 fill-sky-300 hover:text-sky-700',
  },
  cyan: {
    dot: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-400 hover:border-cyan-500',
    icon: 'text-cyan-600 fill-cyan-300 hover:text-cyan-700',
  },
  teal: {
    dot: 'bg-teal-100 hover:bg-teal-200 border-teal-400 hover:border-teal-500',
    icon: 'text-teal-600 fill-teal-300 hover:text-teal-700',
  },
  emerald: {
    dot: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-400 hover:border-emerald-500',
    icon: 'text-emerald-600 fill-emerald-300 hover:text-emerald-700',
  },
  green: {
    dot: 'bg-green-100 hover:bg-green-200 border-green-400 hover:border-green-500',
    icon: 'text-green-600 fill-green-300 hover:text-green-700',
  },
  lime: {
    dot: 'bg-lime-100 hover:bg-lime-200 border-lime-400 hover:border-lime-500',
    icon: 'text-lime-600 fill-lime-300 hover:text-lime-700',
  },
  yellow: {
    dot: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400 hover:border-yellow-500',
    icon: 'text-yellow-600 fill-yellow-300 hover:text-yellow-700',
  },
  amber: {
    dot: 'bg-amber-100 hover:bg-amber-200 border-amber-400 hover:border-amber-500',
    icon: 'text-amber-600 fill-amber-300 hover:text-amber-700',
  },
  orange: {
    dot: 'bg-orange-100 hover:bg-orange-200 border-orange-400 hover:border-orange-500',
    icon: 'text-orange-600 fill-orange-300 hover:text-orange-700',
  },
  red: {
    dot: 'bg-red-100 hover:bg-red-200 border-red-400 hover:border-red-500',
    icon: 'text-red-600 fill-red-300 hover:text-red-700',
  },
  stone: {
    dot: 'bg-stone-100 hover:bg-stone-200 border-stone-400 hover:border-stone-500',
    icon: 'text-stone-600 fill-stone-300 hover:text-stone-700',
  },
} as const;

export function BookmarkIndicator({ 
  color, 
  size = 'md', 
  variant = 'dot',
  className, 
  onClick 
}: BookmarkIndicatorProps) {
  // Get color config
  const colorConfig = typeof color === 'string' 
    ? getBookmarkColorByName(color) 
    : getBookmarkColor(color);
  
  const colorName = colorConfig.name;
  
  const sizeClasses = {
    sm: variant === 'dot' ? 'w-2 h-2' : 'w-3 h-3',
    md: variant === 'dot' ? 'w-3 h-3' : 'w-4 h-4',
    lg: variant === 'dot' ? 'w-4 h-4' : 'w-5 h-5',
  };

  // Get the appropriate color classes
  const colorClasses = colorStyles[colorName];

  if (variant === 'icon') {
    return (
      <Bookmark
        className={cn(
          sizeClasses[size],
          'transition-all cursor-pointer hover:scale-110',
          colorClasses.icon,
          className
        )}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full border-2 transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-sm',
        sizeClasses[size],
        colorClasses.dot,
        className
      )}
      onClick={onClick}
    />
  );
}