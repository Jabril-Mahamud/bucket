// components/file/duplicate-detection.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  Copy,
  Trash2,
  FileText,
  Headphones,
  BookOpen,
  Calendar,
  HardDrive,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface DuplicateGroup {
  key: string;
  files: LibraryFile[];
  duplicateType: 'exact' | 'similar' | 'size';
}

interface DuplicateDetectionProps {
  trigger?: React.ReactNode;
  onFilesDeleted?: () => void;
}

export function DuplicateDetection({ trigger, onFilesDeleted }: DuplicateDetectionProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState(false);
  
  const supabase = createClient();

  const scanForDuplicates = useCallback(async () => {
    setScanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: files, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const duplicates = findDuplicates(files || []);
      setDuplicateGroups(duplicates);
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
    } finally {
      setScanning(false);
    }
  }, [supabase]);

  const findDuplicates = (files: LibraryFile[]): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    
    // Group by exact filename
    const exactMatches = new Map<string, LibraryFile[]>();
    files.forEach(file => {
      const key = file.filename.toLowerCase();
      if (!exactMatches.has(key)) {
        exactMatches.set(key, []);
      }
      exactMatches.get(key)!.push(file);
    });

    // Add exact filename duplicates
    exactMatches.forEach((fileGroup, key) => {
      if (fileGroup.length > 1) {
        groups.push({
          key: `exact-${key}`,
          files: fileGroup,
          duplicateType: 'exact'
        });
      }
    });

    // Group by file size (same size, different names)
    const sizeMatches = new Map<number, LibraryFile[]>();
    files.forEach(file => {
      if (!sizeMatches.has(file.file_size)) {
        sizeMatches.set(file.file_size, []);
      }
      sizeMatches.get(file.file_size)!.push(file);
    });

    sizeMatches.forEach((fileGroup, size) => {
      if (fileGroup.length > 1) {
        // Only add if not already in exact matches
        const hasExactDuplicate = fileGroup.some(file => 
          groups.some(group => 
            group.duplicateType === 'exact' && 
            group.files.some(f => f.id === file.id)
          )
        );
        
        if (!hasExactDuplicate) {
          groups.push({
            key: `size-${size}`,
            files: fileGroup,
            duplicateType: 'size'
          });
        }
      }
    });

    // Group by similar titles (if metadata exists)
    const titleMatches = new Map<string, LibraryFile[]>();
    files.forEach(file => {
      if (file.title) {
        const normalizedTitle = file.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!titleMatches.has(normalizedTitle)) {
          titleMatches.set(normalizedTitle, []);
        }
        titleMatches.get(normalizedTitle)!.push(file);
      }
    });

    titleMatches.forEach((fileGroup, title) => {
      if (fileGroup.length > 1) {
        // Only add if not already in other duplicate groups
        const hasOtherDuplicate = fileGroup.some(file => 
          groups.some(group => 
            group.files.some(f => f.id === file.id)
          )
        );
        
        if (!hasOtherDuplicate) {
          groups.push({
            key: `title-${title}`,
            files: fileGroup,
            duplicateType: 'similar'
          });
        }
      }
    });

    return groups;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) 
      return <Headphones className="h-4 w-4 text-emerald-500" />;
    if (fileType === 'application/pdf') 
      return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType === 'application/epub+zip') 
      return <BookOpen className="h-4 w-4 text-indigo-500" />;
    return <FileText className="h-4 w-4 text-slate-500" />;
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const selectAllInGroup = (group: DuplicateGroup, keepNewest = true) => {
    const newSelection = new Set(selectedFiles);
    
    if (keepNewest) {
      // Select all except the newest file
      const sortedFiles = [...group.files].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      
      sortedFiles.slice(1).forEach(file => {
        newSelection.add(file.id);
      });
    } else {
      // Select all files in group
      group.files.forEach(file => {
        newSelection.add(file.id);
      });
    }
    
    setSelectedFiles(newSelection);
  };

  const deleteSelectedFiles = async () => {
    setResolving(true);
    try {
      const filesToDelete = Array.from(selectedFiles);
      
      for (const fileId of filesToDelete) {
        // Get file info for cleanup
        const { data: file } = await supabase
          .from('files')
          .select('file_path, cover_art_path')
          .eq('id', fileId)
          .single();

        if (file) {
          // Delete cover art if exists
          if (file.cover_art_path) {
            await supabase.storage
              .from('cover-art')
              .remove([file.cover_art_path]);
          }

          // Delete from storage
          await supabase.storage
            .from('user-files')
            .remove([file.file_path]);

          // Delete from database
          await supabase
            .from('files')
            .delete()
            .eq('id', fileId);
        }
      }

      setSelectedFiles(new Set());
      await scanForDuplicates(); // Refresh the list
      onFilesDeleted?.();
    } catch (error) {
      console.error('Error deleting files:', error);
    } finally {
      setResolving(false);
    }
  };

  // Fixed useEffect with proper dependencies
  useEffect(() => {
    if (open && duplicateGroups.length === 0) {
      scanForDuplicates();
    }
  }, [open, duplicateGroups.length, scanForDuplicates]);

  const getDuplicateTypeInfo = (type: DuplicateGroup['duplicateType']) => {
    switch (type) {
      case 'exact':
        return {
          label: 'Exact Match',
          description: 'Same filename',
          color: 'text-red-600 bg-red-50 border-red-200',
          icon: <Copy className="h-3 w-3" />
        };
      case 'similar':
        return {
          label: 'Similar Title',
          description: 'Same title metadata',
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: <AlertTriangle className="h-3 w-3" />
        };
      case 'size':
        return {
          label: 'Same Size',
          description: 'Identical file size',
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: <HardDrive className="h-3 w-3" />
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Find Duplicates
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Duplicate File Detection
          </DialogTitle>
          <DialogDescription>
            Find and manage duplicate files in your library. Select files to delete or keep the newest versions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scan Button */}
          {duplicateGroups.length === 0 && !scanning && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
              <p className="text-muted-foreground mb-4">
                Click below to scan your library for duplicate files
              </p>
              <Button onClick={scanForDuplicates} className="gap-2">
                <Search className="h-4 w-4" />
                Start Scan
              </Button>
            </div>
          )}

          {/* Scanning State */}
          {scanning && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Scanning Library</h3>
              <p className="text-muted-foreground">
                Analyzing files for duplicates...
              </p>
            </div>
          )}

          {/* Results */}
          {duplicateGroups.length > 0 && (
            <>
              {/* Summary and Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Found {duplicateGroups.length} duplicate groups
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.size} files selected for deletion
                  </p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={scanForDuplicates}
                    disabled={scanning}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    <Search className="h-4 w-4" />
                    Rescan
                  </Button>
                  {selectedFiles.size > 0 && (
                    <Button 
                      variant="destructive"
                      onClick={deleteSelectedFiles}
                      disabled={resolving}
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Selected ({selectedFiles.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Duplicate Groups */}
              <div className="space-y-6">
                {duplicateGroups.map((group) => {
                  const typeInfo = getDuplicateTypeInfo(group.duplicateType);
                  
                  return (
                    <Card key={group.key} className="border-2">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn("gap-1", typeInfo.color)}>
                              {typeInfo.icon}
                              {typeInfo.label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {group.files.length} files • {typeInfo.description}
                            </span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllInGroup(group, true)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Keep Newest
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllInGroup(group, false)}
                              className="gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Select All
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        {group.files.map((file, index) => {
                          const isSelected = selectedFiles.has(file.id);
                          const isNewest = index === 0; // Assuming sorted by upload date
                          
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                isSelected ? "border-red-200 bg-red-50" : "border-muted hover:border-primary/20"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleFileSelection(file.id)}
                              />
                              
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {getFileIcon(file.file_type)}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium truncate">
                                      {file.title || file.filename}
                                    </p>
                                    {isNewest && (
                                      <Badge variant="secondary" className="text-xs">
                                        Newest
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {file.title && file.title !== file.filename && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {file.filename}
                                    </p>
                                  )}
                                  
                                  {file.author && (
                                    <p className="text-xs text-muted-foreground">
                                      by {file.author}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    {formatFileSize(file.file_size)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(file.uploaded_at)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* No Duplicates Found */}
          {duplicateGroups.length === 0 && !scanning && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">
                Your library looks clean! No duplicate files were detected.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}