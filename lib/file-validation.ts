// lib/file-validation.ts
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface FileValidationResult {
  isValid: boolean;
  fileType: 'document' | 'audio' | 'unknown';
  mimeType: string;
  category: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  maxSize: number;
  supportLevel: 'full' | 'partial' | 'experimental' | 'unsupported';
}

export interface SupportedFormat {
  extensions: string[];
  mimeTypes: string[];
  category: string;
  displayName: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  maxSize: number; // in MB
  supportLevel: 'full' | 'partial' | 'experimental';
  features: string[];
  limitations?: string[];
  alternatives?: string[];
}

// Define supported formats with detailed information
export const SUPPORTED_FORMATS: Record<string, SupportedFormat> = {
  pdf: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    category: 'Document',
    displayName: 'PDF Document',
    icon: () => null, // Will be filled by component
    iconColor: 'text-red-500',
    maxSize: 100, // 100MB
    supportLevel: 'full',
    features: ['Built-in viewer', 'Progress tracking', 'Download', 'Search text'],
    limitations: ['No editing capabilities']
  },
  epub: {
    extensions: ['epub'],
    mimeTypes: ['application/epub+zip'],
    category: 'Document',
    displayName: 'EPUB eBook',
    icon: () => null,
    iconColor: 'text-indigo-500',
    maxSize: 50, // 50MB
    supportLevel: 'partial',
    features: ['Basic viewer', 'Progress tracking', 'Download'],
    limitations: ['Limited styling support', 'No interactive elements'],
    alternatives: ['Convert to PDF for better compatibility']
  },
  txt: {
    extensions: ['txt', 'text'],
    mimeTypes: ['text/plain'],
    category: 'Document',
    displayName: 'Text Document',
    icon: () => null,
    iconColor: 'text-slate-500',
    maxSize: 10, // 10MB
    supportLevel: 'full',
    features: ['Built-in viewer', 'Progress tracking', 'Download', 'Full text search']
  },
  mp3: {
    extensions: ['mp3'],
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
    category: 'Audio',
    displayName: 'MP3 Audio',
    icon: () => null,
    iconColor: 'text-emerald-500',
    maxSize: 500, // 500MB
    supportLevel: 'full',
    features: ['Built-in player', 'Progress tracking', 'Seeking', 'Volume control', 'Resume playback']
  },
  wav: {
    extensions: ['wav'],
    mimeTypes: ['audio/wav', 'audio/wave'],
    category: 'Audio',
    displayName: 'WAV Audio',
    icon: () => null,
    iconColor: 'text-emerald-500',
    maxSize: 1000, // 1GB
    supportLevel: 'full',
    features: ['Built-in player', 'Progress tracking', 'Seeking', 'Volume control', 'Resume playback'],
    limitations: ['Large file sizes']
  },
  m4a: {
    extensions: ['m4a'],
    mimeTypes: ['audio/mp4', 'audio/m4a'],
    category: 'Audio',
    displayName: 'M4A Audio',
    icon: () => null,
    iconColor: 'text-emerald-500',
    maxSize: 500, // 500MB
    supportLevel: 'full',
    features: ['Built-in player', 'Progress tracking', 'Seeking', 'Volume control', 'Resume playback']
  },
  aac: {
    extensions: ['aac'],
    mimeTypes: ['audio/aac'],
    category: 'Audio',
    displayName: 'AAC Audio',
    icon: () => null,
    iconColor: 'text-emerald-500',
    maxSize: 500, // 500MB
    supportLevel: 'full',
    features: ['Built-in player', 'Progress tracking', 'Seeking', 'Volume control', 'Resume playback']
  },
  ogg: {
    extensions: ['ogg', 'oga'],
    mimeTypes: ['audio/ogg'],
    category: 'Audio',
    displayName: 'OGG Audio',
    icon: () => null,
    iconColor: 'text-emerald-500',
    maxSize: 500, // 500MB
    supportLevel: 'partial',
    features: ['Built-in player', 'Progress tracking', 'Seeking'],
    limitations: ['Limited browser support'],
    alternatives: ['Convert to MP3 for better compatibility']
  },
  flac: {
    extensions: ['flac'],
    mimeTypes: ['audio/flac'],
    category: 'Audio',
    displayName: 'FLAC Audio',
    icon: () => null,
    iconColor: 'text-emerald-600',
    maxSize: 1000, // 1GB
    supportLevel: 'experimental',
    features: ['Download only'],
    limitations: ['No built-in player', 'Limited browser support'],
    alternatives: ['Convert to MP3 or WAV for full support']
  }
};

// Common unsupported formats with suggestions
export const UNSUPPORTED_FORMATS: Record<string, {
  displayName: string;
  reason: string;
  alternatives: string[];
  conversionTools?: string[];
}> = {
  mobi: {
    displayName: 'MOBI eBook',
    reason: 'Amazon Kindle format not supported',
    alternatives: ['Convert to EPUB or PDF'],
    conversionTools: ['Calibre', 'Online converters']
  },
  azw: {
    displayName: 'AZW eBook',
    reason: 'Amazon Kindle format with DRM',
    alternatives: ['Convert to EPUB or PDF (if DRM-free)'],
    conversionTools: ['Calibre (for DRM-free files)']
  },
  doc: {
    displayName: 'Word Document',
    reason: 'Microsoft Word format not optimized for reading',
    alternatives: ['Convert to PDF'],
    conversionTools: ['Microsoft Word', 'LibreOffice', 'Online converters']
  },
  docx: {
    displayName: 'Word Document',
    reason: 'Microsoft Word format not optimized for reading',
    alternatives: ['Convert to PDF'],
    conversionTools: ['Microsoft Word', 'LibreOffice', 'Online converters']
  },
  wma: {
    displayName: 'WMA Audio',
    reason: 'Limited browser support for Windows Media Audio',
    alternatives: ['Convert to MP3 or WAV'],
    conversionTools: ['Audacity', 'VLC Media Player', 'Online converters']
  },
  ape: {
    displayName: 'APE Audio',
    reason: 'Monkey\'s Audio format not supported in browsers',
    alternatives: ['Convert to FLAC or MP3'],
    conversionTools: ['Monkey\'s Audio', 'foobar2000']
  }
};

export function validateFile(file: File): FileValidationResult {
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop() || '';
  const fileSize = file.size;
  const fileSizeMB = fileSize / (1024 * 1024);

  // Find matching supported format
  const supportedFormat = Object.values(SUPPORTED_FORMATS).find(format =>
    format.extensions.includes(extension) || format.mimeTypes.includes(file.type)
  );

  if (supportedFormat) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check file size
    if (fileSizeMB > supportedFormat.maxSize) {
      errors.push(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size of ${supportedFormat.maxSize}MB`);
    }

    // Add warnings for limitations
    if (supportedFormat.limitations) {
      warnings.push(...supportedFormat.limitations);
    }

    // Add suggestions for alternatives
    if (supportedFormat.alternatives) {
      suggestions.push(...supportedFormat.alternatives);
    }

    // Support level warnings
    if (supportedFormat.supportLevel === 'partial') {
      warnings.push('This format has limited support - some features may not work as expected');
    } else if (supportedFormat.supportLevel === 'experimental') {
      warnings.push('This format is experimental - functionality may be limited');
    }

    // File type determination
    let fileType: 'document' | 'audio' | 'unknown' = 'unknown';
    if (supportedFormat.category === 'Document') fileType = 'document';
    else if (supportedFormat.category === 'Audio') fileType = 'audio';

    return {
      isValid: errors.length === 0,
      fileType,
      mimeType: file.type || `application/${extension}`,
      category: supportedFormat.category,
      icon: CheckCircle2,
      iconColor: supportedFormat.iconColor,
      errors,
      warnings,
      suggestions,
      maxSize: supportedFormat.maxSize,
      supportLevel: supportedFormat.supportLevel
    };
  }

  // Check if it's a known unsupported format
  const unsupportedFormat = UNSUPPORTED_FORMATS[extension];
  if (unsupportedFormat) {
    return {
      isValid: false,
      fileType: 'unknown',
      mimeType: file.type || `application/${extension}`,
      category: 'Unsupported',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      errors: [`${unsupportedFormat.displayName} is not supported: ${unsupportedFormat.reason}`],
      warnings: [],
      suggestions: [
        ...unsupportedFormat.alternatives,
        ...(unsupportedFormat.conversionTools ? 
          [`Recommended tools: ${unsupportedFormat.conversionTools.join(', ')}`] : [])
      ],
      maxSize: 0,
      supportLevel: 'unsupported'
    };
  }

  // Unknown format
  return {
    isValid: false,
    fileType: 'unknown',
    mimeType: file.type || `application/${extension}`,
    category: 'Unknown',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    errors: [`File type '.${extension}' is not supported`],
    warnings: [],
    suggestions: [
      'Supported formats: PDF, EPUB, TXT (documents), MP3, WAV, M4A, AAC, OGG (audio)',
      'Try converting your file to a supported format'
    ],
    maxSize: 0,
    supportLevel: 'unsupported'
  };
}

export function getAllSupportedExtensions(): string[] {
  return Object.values(SUPPORTED_FORMATS).flatMap(format => format.extensions);
}

export function getSupportedMimeTypes(): string[] {
  return Object.values(SUPPORTED_FORMATS).flatMap(format => format.mimeTypes);
}

export function getAcceptString(): string {
  const extensions = getAllSupportedExtensions().map(ext => `.${ext}`);
  const mimeTypes = getSupportedMimeTypes();
  return [...extensions, ...mimeTypes].join(',');
}

// Enhanced validation for multiple files
export function validateFiles(files: File[]): {
  valid: File[];
  invalid: Array<{ file: File; validation: FileValidationResult }>;
  totalSize: number;
  warnings: string[];
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; validation: FileValidationResult }> = [];
  let totalSize = 0;
  const warnings: string[] = [];

  files.forEach(file => {
    const validation = validateFile(file);
    totalSize += file.size;

    if (validation.isValid) {
      valid.push(file);
      if (validation.warnings.length > 0) {
        warnings.push(`${file.name}: ${validation.warnings.join(', ')}`);
      }
    } else {
      invalid.push({ file, validation });
    }
  });

  // Check total size limit (2GB total)
  const totalSizeGB = totalSize / (1024 * 1024 * 1024);
  if (totalSizeGB > 2) {
    warnings.push(`Total upload size (${totalSizeGB.toFixed(1)}GB) is very large. Consider uploading in smaller batches.`);
  }

  return { valid, invalid, totalSize, warnings };
}