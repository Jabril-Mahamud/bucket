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
    dot: 'bg-rose-100 hover:bg-rose-200 border-rose-400 hover:border-rose-500 dark:bg-rose-800 dark:hover:bg-rose-700 dark:border-rose-600 dark:hover:border-rose-500',
    icon: 'text-rose-600 fill-rose-300 hover:text-rose-700 dark:text-rose-400 dark:fill-rose-600 dark:hover:text-rose-300',
    highlight: 'bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-800 dark:border-rose-500 dark:text-rose-100',
  },
  pink: {
    dot: 'bg-pink-100 hover:bg-pink-200 border-pink-400 hover:border-pink-500 dark:bg-pink-800 dark:hover:bg-pink-700 dark:border-pink-600 dark:hover:border-pink-500',
    icon: 'text-pink-600 fill-pink-300 hover:text-pink-700 dark:text-pink-400 dark:fill-pink-600 dark:hover:text-pink-300',
    highlight: 'bg-pink-100 border-pink-400 text-pink-900 dark:bg-pink-800 dark:border-pink-500 dark:text-pink-100',
  },
  fuchsia: {
    dot: 'bg-fuchsia-100 hover:bg-fuchsia-200 border-fuchsia-400 hover:border-fuchsia-500 dark:bg-fuchsia-800 dark:hover:bg-fuchsia-700 dark:border-fuchsia-600 dark:hover:border-fuchsia-500',
    icon: 'text-fuchsia-600 fill-fuchsia-300 hover:text-fuchsia-700 dark:text-fuchsia-400 dark:fill-fuchsia-600 dark:hover:text-fuchsia-300',
    highlight: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 dark:bg-fuchsia-800 dark:border-fuchsia-500 dark:text-fuchsia-100',
  },
  purple: {
    dot: 'bg-purple-100 hover:bg-purple-200 border-purple-400 hover:border-purple-500 dark:bg-purple-800 dark:hover:bg-purple-700 dark:border-purple-600 dark:hover:border-purple-500',
    icon: 'text-purple-600 fill-purple-300 hover:text-purple-700 dark:text-purple-400 dark:fill-purple-600 dark:hover:text-purple-300',
    highlight: 'bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-800 dark:border-purple-500 dark:text-purple-100',
  },
  violet: {
    dot: 'bg-violet-100 hover:bg-violet-200 border-violet-400 hover:border-violet-500 dark:bg-violet-800 dark:hover:bg-violet-700 dark:border-violet-600 dark:hover:border-violet-500',
    icon: 'text-violet-600 fill-violet-300 hover:text-violet-700 dark:text-violet-400 dark:fill-violet-600 dark:hover:text-violet-300',
    highlight: 'bg-violet-100 border-violet-400 text-violet-900 dark:bg-violet-800 dark:border-violet-500 dark:text-violet-100',
  },
  indigo: {
    dot: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-400 hover:border-indigo-500 dark:bg-indigo-800 dark:hover:bg-indigo-700 dark:border-indigo-600 dark:hover:border-indigo-500',
    icon: 'text-indigo-600 fill-indigo-300 hover:text-indigo-700 dark:text-indigo-400 dark:fill-indigo-600 dark:hover:text-indigo-300',
    highlight: 'bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-800 dark:border-indigo-500 dark:text-indigo-100',
  },
  blue: {
    dot: 'bg-blue-100 hover:bg-blue-200 border-blue-400 hover:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700 dark:border-blue-600 dark:hover:border-blue-500',
    icon: 'text-blue-600 fill-blue-300 hover:text-blue-700 dark:text-blue-400 dark:fill-blue-600 dark:hover:text-blue-300',
    highlight: 'bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-800 dark:border-blue-500 dark:text-blue-100',
  },
  sky: {
    dot: 'bg-sky-100 hover:bg-sky-200 border-sky-400 hover:border-sky-500 dark:bg-sky-800 dark:hover:bg-sky-700 dark:border-sky-600 dark:hover:border-sky-500',
    icon: 'text-sky-600 fill-sky-300 hover:text-sky-700 dark:text-sky-400 dark:fill-sky-600 dark:hover:text-sky-300',
    highlight: 'bg-sky-100 border-sky-400 text-sky-900 dark:bg-sky-800 dark:border-sky-500 dark:text-sky-100',
  },
  cyan: {
    dot: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-400 hover:border-cyan-500 dark:bg-cyan-800 dark:hover:bg-cyan-700 dark:border-cyan-600 dark:hover:border-cyan-500',
    icon: 'text-cyan-600 fill-cyan-300 hover:text-cyan-700 dark:text-cyan-400 dark:fill-cyan-600 dark:hover:text-cyan-300',
    highlight: 'bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-800 dark:border-cyan-500 dark:text-cyan-100',
  },
  teal: {
    dot: 'bg-teal-100 hover:bg-teal-200 border-teal-400 hover:border-teal-500 dark:bg-teal-800 dark:hover:bg-teal-700 dark:border-teal-600 dark:hover:border-teal-500',
    icon: 'text-teal-600 fill-teal-300 hover:text-teal-700 dark:text-teal-400 dark:fill-teal-600 dark:hover:text-teal-300',
    highlight: 'bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-800 dark:border-teal-500 dark:text-teal-100',
  },
  emerald: {
    dot: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-400 hover:border-emerald-500 dark:bg-emerald-800 dark:hover:bg-emerald-700 dark:border-emerald-600 dark:hover:border-emerald-500',
    icon: 'text-emerald-600 fill-emerald-300 hover:text-emerald-700 dark:text-emerald-400 dark:fill-emerald-600 dark:hover:text-emerald-300',
    highlight: 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-800 dark:border-emerald-500 dark:text-emerald-100',
  },
  green: {
    dot: 'bg-green-100 hover:bg-green-200 border-green-400 hover:border-green-500 dark:bg-green-800 dark:hover:bg-green-700 dark:border-green-600 dark:hover:border-green-500',
    icon: 'text-green-600 fill-green-300 hover:text-green-700 dark:text-green-400 dark:fill-green-600 dark:hover:text-green-300',
    highlight: 'bg-green-100 border-green-400 text-green-900 dark:bg-green-800 dark:border-green-500 dark:text-green-100',
  },
  lime: {
    dot: 'bg-lime-100 hover:bg-lime-200 border-lime-400 hover:border-lime-500 dark:bg-lime-800 dark:hover:bg-lime-700 dark:border-lime-600 dark:hover:border-lime-500',
    icon: 'text-lime-600 fill-lime-300 hover:text-lime-700 dark:text-lime-400 dark:fill-lime-600 dark:hover:text-lime-300',
    highlight: 'bg-lime-100 border-lime-400 text-lime-900 dark:bg-lime-800 dark:border-lime-500 dark:text-lime-100',
  },
  yellow: {
    dot: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400 hover:border-yellow-500 dark:bg-yellow-800 dark:hover:bg-yellow-700 dark:border-yellow-600 dark:hover:border-yellow-500',
    icon: 'text-yellow-600 fill-yellow-300 hover:text-yellow-700 dark:text-yellow-400 dark:fill-yellow-600 dark:hover:text-yellow-300',
    highlight: 'bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-800 dark:border-yellow-500 dark:text-yellow-100',
  },
  amber: {
    dot: 'bg-amber-100 hover:bg-amber-200 border-amber-400 hover:border-amber-500 dark:bg-amber-800 dark:hover:bg-amber-700 dark:border-amber-600 dark:hover:border-amber-500',
    icon: 'text-amber-600 fill-amber-300 hover:text-amber-700 dark:text-amber-400 dark:fill-amber-600 dark:hover:text-amber-300',
    highlight: 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-800 dark:border-amber-500 dark:text-amber-100',
  },
  orange: {
    dot: 'bg-orange-100 hover:bg-orange-200 border-orange-400 hover:border-orange-500 dark:bg-orange-800 dark:hover:bg-orange-700 dark:border-orange-600 dark:hover:border-orange-500',
    icon: 'text-orange-600 fill-orange-300 hover:text-orange-700 dark:text-orange-400 dark:fill-orange-600 dark:hover:text-orange-300',
    highlight: 'bg-orange-100 border-orange-400 text-orange-900 dark:bg-orange-800 dark:border-orange-500 dark:text-orange-100',
  },
  red: {
    dot: 'bg-red-100 hover:bg-red-200 border-red-400 hover:border-red-500 dark:bg-red-800 dark:hover:bg-red-700 dark:border-red-600 dark:hover:border-red-500',
    icon: 'text-red-600 fill-red-300 hover:text-red-700 dark:text-red-400 dark:fill-red-600 dark:hover:text-red-300',
    highlight: 'bg-red-100 border-red-400 text-red-900 dark:bg-red-800 dark:border-red-500 dark:text-red-100',
  },
  stone: {
    dot: 'bg-stone-100 hover:bg-stone-200 border-stone-400 hover:border-stone-500 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border-stone-600 dark:hover:border-stone-500',
    icon: 'text-stone-600 fill-stone-300 hover:text-stone-700 dark:text-stone-400 dark:fill-stone-600 dark:hover:text-stone-300',
    highlight: 'bg-stone-100 border-stone-400 text-stone-900 dark:bg-stone-800 dark:border-stone-500 dark:text-stone-100',
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