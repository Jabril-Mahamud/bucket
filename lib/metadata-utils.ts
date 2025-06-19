// lib/metadata-utils.ts
export interface BookMetadata {
  title?: string;
  author?: string;
  series?: string;
  genre?: string;
  publication_date?: string;
  language?: string;
  description?: string;
  isbn?: string;
  series_number?: number;
  cover_art_path?: string;
}

/**
 * Extract metadata from filename using common patterns
 * Supports patterns like:
 * - "Author Name - Title (Year)"
 * - "Series #1 - Title - Author"
 * - "Title by Author"
 * - "[Genre] Title - Author (Year)"
 */
export function parseMetadataFromFilename(filename: string): BookMetadata {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  const metadata: BookMetadata = {};
  
  // Pattern 1: [Genre] Title - Author (Year)
  const genrePattern = /^\[([^\]]+)\]\s*(.+?)\s*-\s*([^(]+?)(?:\s*\((\d{4})\))?$/;
  const genreMatch = nameWithoutExt.match(genrePattern);
  
  if (genreMatch) {
    metadata.genre = genreMatch[1].trim();
    metadata.title = genreMatch[2].trim();
    metadata.author = genreMatch[3].trim();
    if (genreMatch[4]) {
      metadata.publication_date = `${genreMatch[4]}-01-01`;
    }
    return metadata;
  }
  
  // Pattern 2: Author - Title (Year)
  const authorTitleYearPattern = /^([^-]+?)\s*-\s*(.+?)\s*\((\d{4})\)$/;
  const authorTitleYearMatch = nameWithoutExt.match(authorTitleYearPattern);
  
  if (authorTitleYearMatch) {
    metadata.author = authorTitleYearMatch[1].trim();
    metadata.title = authorTitleYearMatch[2].trim();
    metadata.publication_date = `${authorTitleYearMatch[3]}-01-01`;
    return metadata;
  }
  
  // Pattern 3: Series #Number - Title - Author
  const seriesPattern = /^(.+?)\s*#(\d+)\s*-\s*(.+?)\s*-\s*(.+)$/;
  const seriesMatch = nameWithoutExt.match(seriesPattern);
  
  if (seriesMatch) {
    metadata.series = seriesMatch[1].trim();
    metadata.series_number = parseInt(seriesMatch[2]);
    metadata.title = seriesMatch[3].trim();
    metadata.author = seriesMatch[4].trim();
    return metadata;
  }
  
  // Pattern 4: Title by Author
  const titleByAuthorPattern = /^(.+?)\s+by\s+(.+)$/i;
  const titleByAuthorMatch = nameWithoutExt.match(titleByAuthorPattern);
  
  if (titleByAuthorMatch) {
    metadata.title = titleByAuthorMatch[1].trim();
    metadata.author = titleByAuthorMatch[2].trim();
    return metadata;
  }
  
  // Pattern 5: Author - Title
  const authorTitlePattern = /^([^-]+?)\s*-\s*(.+)$/;
  const authorTitleMatch = nameWithoutExt.match(authorTitlePattern);
  
  if (authorTitleMatch) {
    metadata.author = authorTitleMatch[1].trim();
    metadata.title = authorTitleMatch[2].trim();
    return metadata;
  }
  
  // Fallback: Use filename as title and try to extract year
  const yearPattern = /\((\d{4})\)/;
  const yearMatch = nameWithoutExt.match(yearPattern);
  
  metadata.title = nameWithoutExt.replace(yearPattern, '').trim();
  if (yearMatch) {
    metadata.publication_date = `${yearMatch[1]}-01-01`;
  }
  
  // Set default language
  metadata.language = 'en';
  
  return metadata;
}

/**
 * Detect genre from filename or content
 */
export function detectGenre(filename: string): string | undefined {
  const lowerFilename = filename.toLowerCase();
  
  const genreKeywords = {
    'fiction': ['fiction', 'novel'],
    'science-fiction': ['sci-fi', 'science fiction', 'scifi'],
    'fantasy': ['fantasy', 'magic', 'wizard', 'dragon'],
    'mystery': ['mystery', 'detective', 'crime'],
    'romance': ['romance', 'love'],
    'horror': ['horror', 'scary', 'ghost'],
    'biography': ['biography', 'memoir', 'autobiography'],
    'history': ['history', 'historical'],
    'business': ['business', 'entrepreneur', 'marketing'],
    'self-help': ['self-help', 'personal development'],
    'technology': ['programming', 'tech', 'computer', 'software'],
    'cookbook': ['cookbook', 'recipe', 'cooking'],
    'travel': ['travel', 'guide', 'guidebook'],
  };
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(keyword => lowerFilename.includes(keyword))) {
      return genre;
    }
  }
  
  return undefined;
}

/**
 * Format metadata for display
 */
export function formatMetadataForDisplay(metadata: BookMetadata) {
  const formatted: Record<string, string> = {};
  
  if (metadata.title) formatted['Title'] = metadata.title;
  if (metadata.author) formatted['Author'] = metadata.author;
  if (metadata.series) {
    const seriesText = metadata.series_number 
      ? `${metadata.series} #${metadata.series_number}`
      : metadata.series;
    formatted['Series'] = seriesText;
  }
  if (metadata.genre) formatted['Genre'] = metadata.genre;
  if (metadata.publication_date) {
    const year = new Date(metadata.publication_date).getFullYear();
    formatted['Published'] = year.toString();
  }
  if (metadata.language && metadata.language !== 'en') {
    formatted['Language'] = metadata.language.toUpperCase();
  }
  if (metadata.isbn) formatted['ISBN'] = metadata.isbn;
  
  return formatted;
}

/**
 * Validate metadata fields
 */
export function validateMetadata(metadata: BookMetadata): string[] {
  const errors: string[] = [];
  
  if (metadata.title && metadata.title.length > 500) {
    errors.push('Title must be less than 500 characters');
  }
  
  if (metadata.author && metadata.author.length > 200) {
    errors.push('Author must be less than 200 characters');
  }
  
  if (metadata.series && metadata.series.length > 200) {
    errors.push('Series must be less than 200 characters');
  }
  
  if (metadata.genre && metadata.genre.length > 100) {
    errors.push('Genre must be less than 100 characters');
  }
  
  if (metadata.publication_date) {
    const date = new Date(metadata.publication_date);
    const currentYear = new Date().getFullYear();
    if (isNaN(date.getTime()) || date.getFullYear() > currentYear + 1) {
      errors.push('Invalid publication date');
    }
  }
  
  if (metadata.series_number && (metadata.series_number < 1 || metadata.series_number > 9999)) {
    errors.push('Series number must be between 1 and 9999');
  }
  
  if (metadata.isbn && !/^(?:\d{10}|\d{13})$/.test(metadata.isbn.replace(/[-\s]/g, ''))) {
    errors.push('ISBN must be 10 or 13 digits');
  }
  
  return errors;
}