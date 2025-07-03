// components/file/library-page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        progress: file.file_progress?.[0] ? {
          progress_percentage: file.file_progress[0].progress_percentage || 0,
          last_position: file.file_progress[0].last_position || '0'
        } : null
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
        file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.text_content && file.text_content.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <CardTitle className="text-sm sm:text-base line-clamp-2 leading-tight" title={file.filename}>
                      {file.filename}
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs w-fit">
                        {getFileTypeLabel(file.file_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                {file.progress && file.progress.progress_percentage > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(file.progress.progress_percentage)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatDate(file.uploaded_at)}</span>
                </div>

                {/* Show text content status if relevant */}
                {file.file_type === 'application/pdf' && file.text_content && (
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-600">✓ Text content available ({file.text_content.split(/\s+/).filter(Boolean).length || 0} words)</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Link href={`/library/view/${file.id}`} className="flex-1">
                    <Button size="sm" className="w-full gap-2 text-xs sm:text-sm">
                      <Eye className="h-3 w-3" />
                      Open
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadFile(file)}
                      className="gap-1 flex-1 sm:flex-none"
                    >
                      <Download className="h-3 w-3" />
                      <span className="sm:hidden">Download</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteFile(file)}
                      className="gap-1 flex-1 sm:flex-none hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List View
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-all duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                        <h3 className="font-medium truncate text-sm sm:text-base">{file.filename}</h3>
                        <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs w-fit">
                          {getFileTypeLabel(file.file_type)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{formatDate(file.uploaded_at)}</span>
                        {file.progress && file.progress.progress_percentage > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-primary font-medium">
                              {Math.round(file.progress.progress_percentage)}% complete
                            </span>
                          </>
                        )}
                        {file.text_content && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-green-600">✓ Text content available ({file.text_content.split(/\s+/).filter(Boolean).length || 0} words)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Link href={`/library/view/${file.id}`} className="flex-1 sm:flex-none">
                      <Button size="sm" className="gap-2 w-full sm:w-auto">
                        <Eye className="h-3 w-3" />
                        Open
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadFile(file)}
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="h-3 w-3" />
                        <span className="sm:hidden ml-1">Download</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteFile(file)}
                        className="flex-1 sm:flex-none hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sm:hidden ml-1">Delete</span>
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