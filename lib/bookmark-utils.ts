// lib/bookmark-utils.ts
import { BookmarkColor, BookmarkColorIndex, getBookmarkColor, getBookmarkColorByName, BookmarkPositionData } from '@/lib/types';
/**
 * Get Tailwind CSS classes for a bookmark color (theme-aware)
 */
export function getBookmarkColorClasses(color: BookmarkColor | BookmarkColorIndex) {
  const colorConfig = typeof color === 'string' 
    ? getBookmarkColorByName(color) 
    : getBookmarkColor(color);
  
  return {
    // Light mode: pastel backgrounds with dark text
    // Dark mode: darker backgrounds with light text
    dot: `bg-${colorConfig.name}-400 border-${colorConfig.name}-600 dark:bg-${colorConfig.name}-600 dark:border-${colorConfig.name}-400`,
    indicator: `bg-${colorConfig.name}-100 border-${colorConfig.name}-300 text-${colorConfig.name}-800 dark:bg-${colorConfig.name}-800 dark:border-${colorConfig.name}-600 dark:text-${colorConfig.name}-200`,
    badge: `bg-${colorConfig.name}-50 text-${colorConfig.name}-700 border-${colorConfig.name}-200 dark:bg-${colorConfig.name}-900 dark:text-${colorConfig.name}-300 dark:border-${colorConfig.name}-700`,
    button: `bg-${colorConfig.name}-100 hover:bg-${colorConfig.name}-200 text-${colorConfig.name}-800 border-${colorConfig.name}-300 dark:bg-${colorConfig.name}-800 dark:hover:bg-${colorConfig.name}-700 dark:text-${colorConfig.name}-200 dark:border-${colorConfig.name}-600`,
    ring: `focus:ring-${colorConfig.name}-500 dark:focus:ring-${colorConfig.name}-400`,
    highlight: `bg-${colorConfig.name}-100 border-${colorConfig.name}-400 text-${colorConfig.name}-900 dark:bg-${colorConfig.name}-800 dark:border-${colorConfig.name}-500 dark:text-${colorConfig.name}-100`,
    config: colorConfig
  };
}
/**
 * Generate a readable text preview from content around a position
 */
export function generateTextPreview(
  content: string, 
  position: number, 
  maxLength: number = 100
): string {
  const start = Math.max(0, position - maxLength / 2);
  const end = Math.min(content.length, position + maxLength / 2);
  
  let preview = content.slice(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) preview = '...' + preview;
  if (end < content.length) preview = preview + '...';
  
  return preview.trim();
}

/**
 * Format bookmark position for display
 */
export function formatBookmarkPosition(positionData: BookmarkPositionData): string {
  switch (positionData.type) {
    case 'text':
      return positionData.paragraph 
        ? `Paragraph ${positionData.paragraph}, Character ${positionData.character}`
        : `Character ${positionData.character}`;
    case 'audio':
      return formatAudioTime(positionData.timestamp);
    case 'pdf':
      return `Page ${positionData.page}`;
    default:
      return 'Unknown position';
  }
}

/**
 * Format audio time in MM:SS format
 */
export function formatAudioTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Create a bookmark title from text content
 */
export function generateBookmarkTitle(textPreview: string, maxLength: number = 50): string {
  if (!textPreview) return 'New Bookmark';
  
  // Clean up the text
  const cleaned = textPreview.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Find the last complete word within the limit
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}
