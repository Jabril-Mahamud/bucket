// components/file/enhanced-library-page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Plus,
  Edit,
  User,
  Tag,
  Star,
  Settings,
  Database,
  Copy,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { BulkOperations } from "./bulk-operations";
import { DuplicateDetection } from "./duplicate-detection";
import { CalibreImport } from "./calibre-import";
import { EditMetadataDialog } from "./edit-metadata-dialog";
import { SmartCollections } from "./SmartCollections";
import { FavoriteToggle } from "./FavoriteToggle";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileUpload } from "./file-upload";

interface LibraryFile {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  title?: string;
  author?: string;
  series?: string;
  genre?: string;
  publication_date?: string;
  language?: string;
  description?: string;
  cover_art_path?: string;
  isbn?: string;
  series_number?: number;
  is_favorite?: boolean;
  last_accessed_at?: string;
  progress?: {
    progress_percentage: number;
    last_position: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc' | 'title-asc' | 'title-desc' | 'author-asc' | 'author-desc';
type FilterOption = 'all' | 'pdf' | 'text' | 'audio' | 'with-metadata' | 'without-metadata' | 'favorites' | 'recent';
type ViewMode = 'grid' | 'list';

export function EnhancedLibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<LibraryFile[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Smart collections and sidebar state
  const [showSidebar, setShowSidebar] = useState(true);
  const [fileStats, setFileStats] = useState({
    recent: 0,
    inProgress: 0,
    completed: 0,
    favorites: 0,
    total: 0
  });

  const supabase = createClient();

  const fetchFiles = async () => {
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
          ),
          file_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const formattedFiles = filesData.map(file => ({
        ...file,
        progress: file.file_progress?.[0] || null,
        tags: file.file_tags?.map((ft: any) => ft.tags).filter(Boolean) || []
      }));

      setFiles(formattedFiles);
      setFilteredFiles(formattedFiles);
      calculateFileStats(formattedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tagsData, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAvailableTags(tagsData || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const calculateFileStats = (fileList: LibraryFile[]) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: fileList.length,
      recent: fileList.filter(f => new Date(f.uploaded_at) > weekAgo).length,
      favorites: fileList.filter(f => f.is_favorite).length,
      inProgress: fileList.filter(f => f.progress && f.progress.progress_percentage > 0 && f.progress.progress_percentage < 100).length,
      completed: fileList.filter(f => f.progress && f.progress.progress_percentage >= 100).length,
    };
    
    setFileStats(stats);
  };

  useEffect(() => {
    fetchFiles();
    fetchTags();
  }, []);

  useEffect(() => {
    let filtered = [...files];

    // Apply smart collection filter first
    if (selectedCollection) {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      switch (selectedCollection) {
        case 'recent':
          filtered = filtered.filter(f => new Date(f.uploaded_at) > weekAgo);
          break;
        case 'in-progress':
          filtered = filtered.filter(f => f.progress && f.progress.progress_percentage > 0 && f.progress.progress_percentage < 100);
          break;
        case 'completed':
          filtered = filtered.filter(f => f.progress && f.progress.progress_percentage >= 100);
          break;
        case 'favorites':
          filtered = filtered.filter(f => f.is_favorite);
          break;
      }
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter(file => 
        file.tags?.some(tag => selectedTags.includes(tag.id))
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(query) ||
        file.title?.toLowerCase().includes(query) ||
        file.author?.toLowerCase().includes(query) ||
        file.series?.toLowerCase().includes(query) ||
        file.genre?.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query)
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
          case 'with-metadata':
            return file.title || file.author || file.series || file.genre;
          case 'without-metadata':
            return !file.title && !file.author && !file.series && !file.genre;
          case 'favorites':
            return file.is_favorite;
          case 'recent':
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return new Date(file.uploaded_at) > weekAgo;
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
        case 'title-asc':
          return (a.title || a.filename).localeCompare(b.title || b.filename);
        case 'title-desc':
          return (b.title || b.filename).localeCompare(a.title || a.filename);
        case 'author-asc':
          return (a.author || '').localeCompare(b.author || '');
        case 'author-desc':
          return (b.author || '').localeCompare(a.author || '');
        case 'date-asc':
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case 'date-desc':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case 'size-asc':
          return a.file_size - b.file_size;
        case 'size-desc':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

    setFilteredFiles(filtered);
  }, [files, searchQuery, sortBy, filterBy, selectedCollection, selectedTags]);

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

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCoverImageUrl = (file: LibraryFile) => {
    if (!file.cover_art_path) return null;
    const { data } = supabase.storage
      .from('cover-art')
      .getPublicUrl(file.cover_art_path);
    return data.publicUrl;
  };

  const deleteFile = async (file: LibraryFile) => {
    if (!confirm(`Are you sure you want to delete "${file.title || file.filename}"?`)) return;

    try {
      // Delete cover art if exists
      if (file.cover_art_path) {
        await supabase.storage
          .from('cover-art')
          .remove([file.cover_art_path]);
      }

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

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Library</h2>
            <p className="text-sm text-muted-foreground">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <SmartCollections
              selectedCollection={selectedCollection}
              onCollectionSelect={setSelectedCollection}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              fileStats={fileStats}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!showSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                  className="gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Show Sidebar
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">My Library</h1>
                {selectedFiles.size > 0 && (
                  <Badge variant="secondary">
                    {selectedFiles.size} selected
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Library Management Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Manage</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DuplicateDetection
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Copy className="h-4 w-4 mr-2" />
                        Find Duplicates
                      </DropdownMenuItem>
                    }
                    onFilesDeleted={fetchFiles}
                  />
                  
                  <CalibreImport
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Database className="h-4 w-4 mr-2" />
                        Import from Calibre
                      </DropdownMenuItem>
                    }
                    onImportComplete={fetchFiles}
                  />
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => setShowSidebar(!showSidebar)}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {showSidebar ? 'Hide' : 'Show'} Sidebar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                onClick={() => setShowUpload(!showUpload)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, series, or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 grid grid-cols-2 sm:flex gap-2">
                <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                  <SelectTrigger className="h-10">
                    <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="text">Books</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="with-metadata">With Metadata</SelectItem>
                    <SelectItem value="without-metadata">Without Metadata</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="h-10">
                    <SortAsc className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="title-asc">Title A-Z</SelectItem>
                    <SelectItem value="title-desc">Title Z-A</SelectItem>
                    <SelectItem value="author-asc">Author A-Z</SelectItem>
                    <SelectItem value="author-desc">Author Z-A</SelectItem>
                    <SelectItem value="name-asc">Filename A-Z</SelectItem>
                    <SelectItem value="name-desc">Filename Z-A</SelectItem>
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
                  className="h-8 flex-1 sm:flex-none sm:w-8 sm:p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span className="ml-2 sm:hidden">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 flex-1 sm:flex-none sm:w-8 sm:p-0"
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 sm:hidden">List</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {showUpload && (
            <div className="border-2 border-dashed border-primary/20 rounded-lg p-4 bg-primary/5">
              <FileUpload 
                onUploadComplete={() => {
                  fetchFiles();
                  fetchTags();
                  setShowUpload(false);
                }} 
                maxFiles={50}
              />
            </div>
          )}
        </div>

        {/* Bulk Operations Bar */}
        {selectedFiles.size > 0 && (
          <BulkOperations
            selectedFiles={selectedFiles}
            allFiles={filteredFiles}
            onSelectionChange={setSelectedFiles}
            onOperationComplete={() => {
              fetchFiles();
              clearSelection();
            }}
            availableTags={availableTags}
          />
        )}

        {/* File Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => {
                const coverUrl = getCoverImageUrl(file);
                const displayTitle = file.title || file.filename;
                const isSelected = selectedFiles.has(file.id);
                
                return (
                  <Card 
                    key={file.id} 
                    className={cn(
                      "group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 cursor-pointer",
                      isSelected ? "border-primary bg-primary/5" : "hover:border-primary/20"
                    )}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        className="bg-white shadow-sm"
                      />
                    </div>

                    {/* Cover Image or Icon */}
                    <div className="relative aspect-[3/4] rounded-t-xl overflow-hidden bg-muted/30">
                      {coverUrl ? (
                        <img 
                          src={coverUrl} 
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getFileIcon(file.file_type)}
                        </div>
                      )}
                      
                      {/* Favorite Toggle */}
                      <div className="absolute top-2 right-2">
                        <FavoriteToggle
                          fileId={file.id}
                          isFavorite={!!file.is_favorite}
                          onToggle={fetchFiles}
                          size="sm"
                          className="bg-white/90 hover:bg-white shadow-sm"
                        />
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="space-y-2">
                        <CardTitle className="text-sm sm:text-base line-clamp-2 leading-tight" title={displayTitle}>
                          {displayTitle}
                        </CardTitle>
                        
                        {/* Author */}
                        {file.author && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{file.author}</span>
                          </div>
                        )}
                        
                        {/* Series */}
                        {file.series && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            <span className="truncate">
                              {file.series_number ? `${file.series} #${file.series_number}` : file.series}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs">
                            {getFileTypeLabel(file.file_type)}
                          </Badge>
                          {file.genre && (
                            <Badge variant="outline" className="text-xs">
                              {file.genre}
                            </Badge>
                          )}
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

                      {/* Tags */}
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {file.tags.slice(0, 2).map(tag => (
                            <Badge key={tag.id} variant="outline" className="text-xs gap-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </Badge>
                          ))}
                          {file.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{file.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* File info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatDate(file.uploaded_at)}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.file_size)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Link href={`/library/view/${file.id}`} className="flex-1">
                          <Button 
                            size="sm" 
                            className="w-full gap-2 text-xs sm:text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-3 w-3" />
                            Open
                          </Button>
                        </Link>
                        <div className="flex gap-2">
                          <EditMetadataDialog 
                            file={file} 
                            onSave={fetchFiles}
                            trigger={
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="gap-1 flex-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Edit className="h-3 w-3" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                            }
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            className="gap-1 flex-1"
                          >
                            <Download className="h-3 w-3" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file);
                            }}
                            className="gap-1 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // List View (keeping the existing list view implementation)
            <div className="space-y-3">
              {filteredFiles.map((file) => {
                const coverUrl = getCoverImageUrl(file);
                const displayTitle = file.title || file.filename;
                const isSelected = selectedFiles.has(file.id);
                
                return (
                  <Card 
                    key={file.id} 
                    className={cn(
                      "group hover:shadow-md transition-all duration-200 cursor-pointer",
                      isSelected ? "border-primary bg-primary/5" : ""
                    )}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                          />
                          
                          {/* Cover or Icon */}
                          <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-muted/30">
                            {coverUrl ? (
                              <img 
                                src={coverUrl} 
                                alt={displayTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {getFileIcon(file.file_type)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                              <h3 className="font-medium truncate text-sm sm:text-base">{displayTitle}</h3>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={getFileTypeBadgeVariant(file.file_type)} className="text-xs">
                                  {getFileTypeLabel(file.file_type)}
                                </Badge>
                                {file.genre && (
                                  <Badge variant="outline" className="text-xs">
                                    {file.genre}
                                  </Badge>
                                )}
                                {file.is_favorite && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Star className="h-3 w-3 fill-current" />
                                    Favorite
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                              {file.author && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{file.author}</span>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          <Link href={`/library/view/${file.id}`} className="flex-1 sm:flex-none">
                            <Button 
                              size="sm" 
                              className="gap-2 w-full sm:w-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="h-3 w-3" />
                              Open
                            </Button>
                          </Link>
                          <div className="flex gap-2">
                            <EditMetadataDialog 
                              file={file} 
                              onSave={fetchFiles}
                              trigger={
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 sm:flex-none"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Edit className="h-3 w-3" />
                                  <span className="sm:hidden ml-1">Edit</span>
                                </Button>
                              }
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                              }}
                              className="flex-1 sm:flex-none"
                            >
                              <Download className="h-3 w-3" />
                              <span className="sm:hidden ml-1">Download</span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file);
                              }}
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}