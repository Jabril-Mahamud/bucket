// components/file/calibre-import.tsx
"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  FileUp,
  Upload,
  BookOpen,
  Database,
  Import,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  FolderOpen,
  File,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface CalibreBook {
  id?: string;
  title: string;
  authors: string;
  series?: string;
  series_index?: number;
  path?: string;
  formats?: string;
  pubdate?: string;
  tags?: string;
  rating?: number;
  comments?: string;
  language?: string;
  isbn?: string;
  publisher?: string;
  // File info for actual import
  fileContent?: Blob;
  fileName?: string;
  fileSize?: number;
}

interface ImportProgress {
  total: number;
  completed: number;
  current: string;
  errors: string[];
}

interface CalibreImportProps {
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

export function CalibreImport({ trigger, onImportComplete }: CalibreImportProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvParsed, setCsvParsed] = useState(false);
  const [books, setBooks] = useState<CalibreBook[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    completed: 0,
    current: '',
    errors: []
  });
  
  const csvFileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const calibreBooks = results.data.map((row: any, index: number) => ({
          id: index.toString(),
          title: row.title || row.Title || 'Unknown Title',
          authors: row.authors || row.Authors || row.author || row.Author || 'Unknown Author',
          series: row.series || row.Series || '',
          series_index: parseFloat(row.series_index || row['Series Index'] || 0) || undefined,
          path: row.path || row.Path || '',
          formats: row.formats || row.Formats || '',
          pubdate: row.pubdate || row['Publication Date'] || row.published || '',
          tags: row.tags || row.Tags || '',
          rating: parseFloat(row.rating || row.Rating || 0) || undefined,
          comments: row.comments || row.Comments || row.description || '',
          language: row.languages || row.Languages || row.language || 'en',
          isbn: row.isbn || row.ISBN || '',
          publisher: row.publisher || row.Publisher || '',
        })) as CalibreBook[];

        setBooks(calibreBooks);
        setCsvParsed(true);
        // Select all books by default
        setSelectedBooks(new Set(calibreBooks.map((_, index) => index)));
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
      }
    });
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const supportedFormats = ['pdf', 'epub', 'txt', 'mp3', 'wav', 'm4a', 'aac', 'ogg'];
    const bookFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension && supportedFormats.includes(extension);
    });

    const calibreBooks = bookFiles.map((file, index) => {
      // Extract metadata from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split(' - ');
      
      let title = nameWithoutExt;
      let authors = 'Unknown Author';
      
      if (parts.length >= 2) {
        authors = parts[0].trim();
        title = parts[1].trim();
      }

      return {
        id: index.toString(),
        title,
        authors,
        fileName: file.name,
        fileContent: file,
        fileSize: file.size,
        formats: file.name.split('.').pop()?.toUpperCase() || '',
        language: 'en'
      };
    });

    setBooks(calibreBooks);
    setCsvParsed(true);
    setSelectedBooks(new Set(calibreBooks.map((_, index) => index)));
  };

  const toggleBookSelection = (index: number) => {
    const newSelection = new Set(selectedBooks);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedBooks(newSelection);
  };

  const selectAll = () => {
    setSelectedBooks(new Set(books.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedBooks(new Set());
  };

  const importSelectedBooks = async () => {
    setImporting(true);
    const selectedBooksArray = Array.from(selectedBooks).map(index => books[index]);
    
    setImportProgress({
      total: selectedBooksArray.length,
      completed: 0,
      current: '',
      errors: []
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (let i = 0; i < selectedBooksArray.length; i++) {
        const book = selectedBooksArray[i];
        
        setImportProgress(prev => ({
          ...prev,
          current: book.title,
          completed: i
        }));

        try {
          let filePath = '';
          let fileSize = 0;
          let fileType = '';

          // If we have actual file content (from folder upload)
          if (book.fileContent && book.fileName) {
            filePath = `${user.id}/${book.fileName}`;
            fileSize = book.fileSize || 0;
            fileType = getFileType(book.fileName);

            // Upload file to storage
            const { error: storageError } = await supabase.storage
              .from('user-files')
              .upload(filePath, book.fileContent, { upsert: false });

            if (storageError) throw storageError;
          } else {
            // For CSV import without files, create placeholder entries
            const fileName = `${book.authors} - ${book.title}.unknown`;
            filePath = `${user.id}/${fileName}`;
            fileType = 'application/octet-stream';
          }

          // Parse publication date
          let publicationDate = null;
          if (book.pubdate) {
            const date = new Date(book.pubdate);
            if (!isNaN(date.getTime())) {
              publicationDate = date.toISOString().split('T')[0];
            }
          }

          // Clean up tags
          const tags = book.tags ? book.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
          const genre = tags.length > 0 ? tags[0] : undefined;

          // Insert into database
          const { error: dbError } = await supabase
            .from('files')
            .insert({
              user_id: user.id,
              filename: book.fileName || `${book.authors} - ${book.title}`,
              file_path: filePath,
              file_type: fileType,
              file_size: fileSize,
              title: book.title,
              author: book.authors,
              series: book.series || null,
              series_number: book.series_index || null,
              genre: genre || null,
              publication_date: publicationDate,
              language: book.language || 'en',
              description: book.comments || null,
              isbn: book.isbn || null,
            });

          if (dbError) throw dbError;

        } catch (error) {
          console.error(`Error importing ${book.title}:`, error);
          setImportProgress(prev => ({
            ...prev,
            errors: [...prev.errors, `Failed to import "${book.title}": ${error instanceof Error ? error.message : 'Unknown error'}`]
          }));
        }
      }

      setImportProgress(prev => ({
        ...prev,
        completed: selectedBooksArray.length,
        current: 'Complete!'
      }));

      onImportComplete?.();
      
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const getFileType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const typeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'epub': 'application/epub+zip',
      'txt': 'text/plain',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg'
    };

    return typeMap[extension || ''] || 'application/octet-stream';
  };

  const getFileIcon = (formats: string) => {
    const format = formats.toLowerCase();
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(format)) {
      return <BookOpen className="h-4 w-4 text-emerald-500" />;
    }
    if (format === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (format === 'epub') {
      return <BookOpen className="h-4 w-4 text-indigo-500" />;
    }
    return <File className="h-4 w-4 text-slate-500" />;
  };

  const reset = () => {
    setBooks([]);
    setSelectedBooks(new Set());
    setCsvParsed(false);
    setImporting(false);
    setImportProgress({ total: 0, completed: 0, current: '', errors: [] });
    if (csvFileRef.current) csvFileRef.current.value = '';
    if (folderRef.current) folderRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) reset();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Import className="h-4 w-4" />
            Import from Calibre
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Import from Calibre Library
          </DialogTitle>
          <DialogDescription>
            Import your existing Calibre library metadata and files into Personal Library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!csvParsed && (
            <Tabs defaultValue="csv" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">CSV Metadata</TabsTrigger>
                <TabsTrigger value="folder">Folder with Files</TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv" className="space-y-4">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Import from CSV Export</AlertTitle>
                  <AlertDescription>
                    Export your Calibre library to CSV format from Calibres *Convert books* dialog, 
                    then upload the CSV file here to import metadata.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => csvFileRef.current?.click()}
                      >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Upload Calibre CSV Export</h3>
                        <p className="text-muted-foreground mb-4">
                          Click to select your exported CSV file from Calibre
                        </p>
                        <input
                          ref={csvFileRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          className="hidden"
                        />
                        <Button variant="outline">
                          <FileUp className="h-4 w-4 mr-2" />
                          Choose CSV File
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>How to export from Calibre:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 ml-4">
                          <li>Open Calibre and select your library</li>
                          <li>Select all books (Ctrl+A)</li>
                          <li>Click *Convert books* → *Bulk convert*</li>
                          <li>Choose *CSV* as output format</li>
                          <li>Click *OK* to generate the CSV file</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="folder" className="space-y-4">
                <Alert>
                  <FolderOpen className="h-4 w-4" />
                  <AlertTitle>Import Files Directly</AlertTitle>
                  <AlertDescription>
                    Select a folder containing your ebook and audiobook files. 
                    The system will attempt to extract metadata from filenames.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => folderRef.current?.click()}
                      >
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Select Book Files</h3>
                        <p className="text-muted-foreground mb-4">
                          Choose multiple files from your Calibre library folder
                        </p>
                        <input
                          ref={folderRef}
                          type="file"
                          multiple
                          accept=".pdf,.epub,.txt,.mp3,.wav,.m4a,.aac,.ogg"
                          onChange={handleFolderUpload}
                          className="hidden"
                        />
                        <Button variant="outline">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Choose Files
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p><strong>Supported formats:</strong> PDF, EPUB, TXT, MP3, WAV, M4A, AAC, OGG</p>
                        <p><strong>Filename format:</strong> *Author Name - Book Title.ext* works best for metadata extraction</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {csvParsed && !importing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Found {books.length} books</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooks.size} selected for import
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>
                    Select None
                  </Button>
                  <Button variant="outline" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {books.map((book, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer",
                      selectedBooks.has(index) && "bg-primary/5"
                    )}
                    onClick={() => toggleBookSelection(index)}
                  >
                    <Checkbox 
                      checked={selectedBooks.has(index)}
                      onChange={() => {}} // Handled by onClick above
                    />
                    
                    <div className="flex-shrink-0">
                      {getFileIcon(book.formats || '')}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{book.title}</p>
                        {book.formats && (
                          <Badge variant="outline" className="text-xs">
                            {book.formats}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        by {book.authors}
                      </p>
                      {book.series && (
                        <p className="text-xs text-muted-foreground">
                          {book.series} {book.series_index ? `#${book.series_index}` : ''}
                        </p>
                      )}
                    </div>
                    
                    {book.fileSize && (
                      <div className="text-xs text-muted-foreground">
                        {Math.round(book.fileSize / 1024 / 1024 * 100) / 100} MB
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Importing Books</h3>
                <p className="text-muted-foreground">
                  {importProgress.completed} of {importProgress.total} completed
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round((importProgress.completed / importProgress.total) * 100)}%</span>
                </div>
                <Progress 
                  value={(importProgress.completed / importProgress.total) * 100} 
                  className="h-3"
                />
              </div>

              {importProgress.current && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing: {importProgress.current}</span>
                </div>
              )}

              {importProgress.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Import Errors</AlertTitle>
                  <AlertDescription>
                    <div className="max-h-32 overflow-y-auto">
                      {importProgress.errors.map((error, index) => (
                        <div key={index} className="text-xs">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {importing && importProgress.completed === importProgress.total && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
              <p className="text-muted-foreground">
                Successfully imported {importProgress.completed - importProgress.errors.length} books
                {importProgress.errors.length > 0 && ` (${importProgress.errors.length} errors)`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {csvParsed && !importing && selectedBooks.size > 0 && (
            <Button onClick={importSelectedBooks} className="gap-2">
              <Import className="h-4 w-4" />
              Import {selectedBooks.size} Books
            </Button>
          )}
          {importing && importProgress.completed === importProgress.total && (
            <Button onClick={() => setOpen(false)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}