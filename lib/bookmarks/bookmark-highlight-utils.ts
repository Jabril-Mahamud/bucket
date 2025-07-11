// lib/bookmark-highlight-utils.ts
import { BookmarkColor } from "@/lib/types";

/**
 * Get static CSS classes for bookmark highlighting
 * This ensures all classes are included in the Tailwind build
 */
export function getBookmarkHighlightClasses(color: BookmarkColor) {
  const colorClassMap: Record<BookmarkColor, string> = {
    rose: "bg-rose-100 border-rose-400 text-rose-900 dark:bg-rose-800 dark:border-rose-500 dark:text-rose-100",
    pink: "bg-pink-100 border-pink-400 text-pink-900 dark:bg-pink-800 dark:border-pink-500 dark:text-pink-100",
    fuchsia: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900 dark:bg-fuchsia-800 dark:border-fuchsia-500 dark:text-fuchsia-100",
    purple: "bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-800 dark:border-purple-500 dark:text-purple-100",
    violet: "bg-violet-100 border-violet-400 text-violet-900 dark:bg-violet-800 dark:border-violet-500 dark:text-violet-100",
    indigo: "bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-800 dark:border-indigo-500 dark:text-indigo-100",
    blue: "bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-800 dark:border-blue-500 dark:text-blue-100",
    sky: "bg-sky-100 border-sky-400 text-sky-900 dark:bg-sky-800 dark:border-sky-500 dark:text-sky-100",
    cyan: "bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-800 dark:border-cyan-500 dark:text-cyan-100",
    teal: "bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-800 dark:border-teal-500 dark:text-teal-100",
    emerald: "bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-800 dark:border-emerald-500 dark:text-emerald-100",
    green: "bg-green-100 border-green-400 text-green-900 dark:bg-green-800 dark:border-green-500 dark:text-green-100",
    lime: "bg-lime-100 border-lime-400 text-lime-900 dark:bg-lime-800 dark:border-lime-500 dark:text-lime-100",
    yellow: "bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-800 dark:border-yellow-500 dark:text-yellow-100",
    amber: "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-800 dark:border-amber-500 dark:text-amber-100",
    orange: "bg-orange-100 border-orange-400 text-orange-900 dark:bg-orange-800 dark:border-orange-500 dark:text-orange-100",
    red: "bg-red-100 border-red-400 text-red-900 dark:bg-red-800 dark:border-red-500 dark:text-red-100",
    stone: "bg-stone-100 border-stone-400 text-stone-900 dark:bg-stone-800 dark:border-stone-500 dark:text-stone-100",
  };

  return colorClassMap[color] || colorClassMap.blue; // Default to blue if color not found
}

/**
 * Get hover classes for bookmark highlighting
 */
export function getBookmarkHoverClasses(color: BookmarkColor) {
  const hoverClassMap: Record<BookmarkColor, string> = {
    rose: "hover:bg-rose-200 dark:hover:bg-rose-700",
    pink: "hover:bg-pink-200 dark:hover:bg-pink-700",
    fuchsia: "hover:bg-fuchsia-200 dark:hover:bg-fuchsia-700",
    purple: "hover:bg-purple-200 dark:hover:bg-purple-700",
    violet: "hover:bg-violet-200 dark:hover:bg-violet-700",
    indigo: "hover:bg-indigo-200 dark:hover:bg-indigo-700",
    blue: "hover:bg-blue-200 dark:hover:bg-blue-700",
    sky: "hover:bg-sky-200 dark:hover:bg-sky-700",
    cyan: "hover:bg-cyan-200 dark:hover:bg-cyan-700",
    teal: "hover:bg-teal-200 dark:hover:bg-teal-700",
    emerald: "hover:bg-emerald-200 dark:hover:bg-emerald-700",
    green: "hover:bg-green-200 dark:hover:bg-green-700",
    lime: "hover:bg-lime-200 dark:hover:bg-lime-700",
    yellow: "hover:bg-yellow-200 dark:hover:bg-yellow-700",
    amber: "hover:bg-amber-200 dark:hover:bg-amber-700",
    orange: "hover:bg-orange-200 dark:hover:bg-orange-700",
    red: "hover:bg-red-200 dark:hover:bg-red-700",
    stone: "hover:bg-stone-200 dark:hover:bg-stone-700",
  };

  return hoverClassMap[color] || hoverClassMap.blue;
}