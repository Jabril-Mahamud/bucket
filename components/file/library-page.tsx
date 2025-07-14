// components/file/library-page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Upload, 
  FileText, 
  Calendar,
  Download,
  Trash2,
  Eye,
  BookOpen,
  Headphones,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Plus
} from "lucide-react";
import { FileUpload } from "./file-upload";
import Link from "next/link";
import { LibraryFile, FileProgressData, DatabaseFile } from "@/lib/types";

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';
type FilterOption = 'all' | 'pdf' | 'text' | 'audio';
type ViewMode = 'grid' | 'list';

export function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  
  const supabase = createClient();

  const fetchFiles = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: filesData, error } = await supabase
        .from('files')
        .select(`
          *,
          file_progress (
            progress_percentage,
            last_position
          )
        `)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Type the file data to match our query structure
      const typedFilesData = filesData as (DatabaseFile & {
        file_progress: FileProgressData[] | null;
      })[];

      const formattedFiles: LibraryFile[] = typedFilesData.map(file => ({
        ...file,
        progress: file.file_progress?.[0] || null
      }));

      setFiles(formattedFiles);
      setFilteredFiles(formattedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    let filtered = [...files];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(file => {
        switch (filterBy) {
          case 'pdf':
            return file.file_type === 'application/pdf';
          case 'text':
            return file.file_type.startsWith('text/') || file.file_type === 'application/epub+zip';
          case 'audio':
            return file.file_type.startsWith('audio/');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.filename.localeCompare(b.filename);
        case 'name-desc':
          return b.filename.localeCompare(a.filename);
        case 'date-asc':
          return new Date(a.uploaded_at || '').getTime() - new Date(b.uploaded_at || '').getTime();
        case 'date-desc':
          return new Date(b.uploaded_at || '').getTime() - new Date(a.uploaded_at || '').getTime();
        case 'size-asc':
          return (a.file_size || 0) - (b.file_size || 0);
        case 'size-desc':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return 0;
      }
    });

    setFilteredFiles(filtered);
  }, [files, searchQuery, sortBy, filterBy]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) 
      return <Headphones className="h-8 w-8 text-emerald-500" />;
    if (fileType === 'application/pdf') 
      return <FileText className="h-8 w-8 text-red-500" />;
    if (fileType === 'application/epub+zip') 
      return <BookOpen className="h-8 w-8 text-indigo-500" />;
    return <FileText className="h-8 w-8 text-slate-500" />;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType.startsWith('audio/')) return 'Audio';
    if (fileType === 'application/pdf') return 'PDF';
    if (fileType === 'application/epub+zip') return 'EPUB';
    if (fileType.startsWith('text/')) return 'Text';
    return 'Unknown';
  };

  const getFileTypeBadgeVariant = (fileType: string): "default" | "secondary" | "destructive" | "outline" => {
    if (fileType.startsWith('audio/')) return 'default';
    if (fileType === 'application/pdf') return 'destructive';
    if (fileType === 'application/epub+zip') return 'secondary';
    return 'outline';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const deleteFile = async (file: LibraryFile) => {
    if (!confirm(`Are you sure you want to delete "${file.filename}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database (this will cascade to file_progress)
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      // Refresh the list
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const downloadFile = async (file: LibraryFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // Helper functions for better button labels
  const getOpenButtonText = (fileType: string) => {
    if (fileType.startsWith('audio/')) return 'Listen';
    if (fileType === 'application/pdf') return 'Read';
    if (fileType.startsWith('text/') || fileType === 'application/epub+zip') return 'Read';
    return 'Open';
  };

  const getOpenButtonIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) return <Headphones className="h-3 w-3" />;
    if (fileType === 'application/pdf') return <BookOpen className="h-3 w-3" />;
    if (fileType.startsWith('text/') || fileType === 'application/epub+zip') return <BookOpen className="h-3 w-3" />;
    return <Eye className="h-3 w-3" />;
  };

  // Helper function to check if file has valid progress
  const hasValidProgress = (file: LibraryFile) => {
    return file.progress && 
           file.progress.progress_percentage !== null && 
           file.progress.progress_percentage > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh]">
        <div className="text-center space-y-4 px-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-base sm:text-lg text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">My Library</h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              {files.length === 0 ? 'No files yet' : `${files.length} ${files.length === 1 ? 'file' : 'files'} in your collection`}
            </p>
          </div>
          <Button 
            onClick={() => setShowUpload(!showUpload)}
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">Upload</span>
            <span className="hidden sm:inline">Upload Files</span>
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="border-2 border-dashed border-primary/20 rounded-lg p-4 sm:p-6 bg-primary/5">
          <FileUpload onUploadComplete={() => {
            fetchFiles();
            setShowUpload(false);
          }} />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 sm:flex gap-2">
                <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                  <SelectTrigger className="h-11">
                    <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="text">Books</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="h-11">
                    <SortAsc className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="size-desc">Largest First</SelectItem>
                    <SelectItem value="size-asc">Smallest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="border rounded-md p-1 flex w-full sm:w-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-9 flex-1 sm:flex-none sm:w-9 sm:p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span className="ml-2 sm:hidden">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-9 flex-1 sm:flex-none sm:w-9 sm:p-0"
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 sm:hidden">List</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-12 sm:pt-16 pb-12 sm:pb-16 text-center px-4 sm:px-6">
            <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
              {files.length === 0 ? (
                <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
              ) : (
                <Search className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">
              {files.length === 0 ? "Your library is empty" : "No files found"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto px-4">
              {files.length === 0 
                ? "Upload your first document or audio file to get started building your personal library" 
                : "Try adjusting your search terms or filters to find what you're looking for"
              }
            </p>
            {files.length === 0 && (
              <Button onClick={() => setShowUpload(true)} size="lg" className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Upload File</span>
                <span className="hidden sm:inline">Upload Your First File</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group flex flex-col justify-between hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <CardTitle className="text-sm sm:text-base line-clamp-3 leading-tight font-semibold" title={file.filename}>
                      {file.filename}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs font-medium">
                        {getFileTypeLabel(file.file_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 text-sm">
                {/* Progress Bar */}
                {hasValidProgress(file) && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(file.progress!.progress_percentage!)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${file.progress!.progress_percentage!}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(file.uploaded_at)}</span>
                </div>
              </CardContent>

              {/* Action Buttons */}
              <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t mt-auto">
                <Link href={`/library/view/${file.id}`} className="w-full">
                  <Button size="sm" className="w-full gap-2">
                    {getOpenButtonIcon(file.file_type)}
                    {getOpenButtonText(file.file_type)}
                  </Button>
                </Link>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadFile(file)}
                    className="w-full sm:w-auto flex-1"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => deleteFile(file)}
                    className="w-full sm:w-auto flex-1 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        }
        </div>
      ) : (
        // List View
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-all duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 mb-1">
                        <h3 className="font-semibold truncate text-sm sm:text-base leading-tight">{file.filename}</h3>
                        <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs w-fit font-medium">
                          {getFileTypeLabel(file.file_type)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground font-mono">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="hidden sm:inline text-muted-foreground/50">•</span>
                        <span>{formatDate(file.uploaded_at)}</span>
                        {hasValidProgress(file) && (
                          <>
                            <span className="hidden sm:inline text-muted-foreground/50">•</span>
                            <span className="text-primary font-medium flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary"/>
                              {Math.round(file.progress!.progress_percentage!)}% complete
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Link href={`/library/view/${file.id}`} className="flex-1 sm:flex-none">
                      <Button size="sm" className="gap-2 w-full sm:w-auto">
                        {getOpenButtonIcon(file.file_type)}
                        {getOpenButtonText(file.file_type)}
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadFile(file)}
                        className="flex-1 sm:flex-none"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteFile(file)}
                        className="flex-1 sm:flex-none hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}