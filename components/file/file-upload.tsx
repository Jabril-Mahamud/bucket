// components/file/-file-upload.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  File, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  Music,
  BookOpen,
  X,
  RotateCcw,
  Sparkles,
  User,
  Tag,
  Calendar,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFiles, FileValidationResult } from "@/lib/file-validation";
import { FileValidationDialog, FileValidationPreview } from "./file-validation-dialog";
import { parseMetadataFromFilename, BookMetadata, validateMetadata } from "@/lib/metadata-utils";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'validating' | 'uploading' | 'success' | 'error';
  error?: string;
  metadata?: BookMetadata;
  validation?: FileValidationResult;
}

interface FileUploadProps {
  onUploadComplete?: () => void;
  maxFiles?: number;
  className?: string;
}

export function FileUpload({ 
  onUploadComplete, 
  maxFiles = 50,
  className 
}: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  
  const supabase = createClient();

  const handleUploadFiles = useCallback(async (filesToUpload: UploadFile[]) => {
    setIsUploading(true);
    
    for (const uploadFile of filesToUpload) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update status to uploading
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' as const, progress: 10 }
            : f
        ));

        // Create file path: user_id/filename
        const filePath = `${user.id}/${uploadFile.file.name}`;
        
        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('user-files')
          .upload(filePath, uploadFile.file, {
            upsert: false
          });

        if (storageError) throw storageError;

        // Update progress
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 70 }
            : f
        ));

        // Validate metadata before saving
        if (uploadFile.metadata) {
          const validationErrors = validateMetadata(uploadFile.metadata);
          if (validationErrors.length > 0) {
            console.warn('Metadata validation errors:', validationErrors);
          }
        }

        // Save metadata to database with extracted metadata
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            filename: uploadFile.file.name,
            file_path: storageData.path,
            file_type: uploadFile.file.type,
            file_size: uploadFile.file.size,
            // Include extracted metadata with proper null handling
            title: uploadFile.metadata?.title || null,
            author: uploadFile.metadata?.author || null,
            series: uploadFile.metadata?.series || null,
            genre: uploadFile.metadata?.genre || null,
            publication_date: uploadFile.metadata?.publication_date || null,
            language: uploadFile.metadata?.language || 'en',
            description: uploadFile.metadata?.description || null,
            isbn: uploadFile.metadata?.isbn || null,
            series_number: uploadFile.metadata?.series_number || null,
            cover_art_path: null, // Will be uploaded separately if needed
          });

        if (dbError) throw dbError;

        // Mark as complete
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 100, status: 'success' as const }
            : f
        ));

      } catch (error) {
        console.error('Upload error:', error);
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        ));
      }
    }
    
    setIsUploading(false);
    onUploadComplete?.();
  }, [supabase, onUploadComplete]);

  const processValidatedFiles = useCallback((validFiles: File[]) => {
    const newFiles: UploadFile[] = validFiles.map(file => {
      // Extract metadata from filename
      const metadata = parseMetadataFromFilename(file.name);
      
      return {
        file,
        id: Math.random().toString(36).substring(7),
        progress: 0,
        status: 'pending' as const,
        metadata
      };
    });
    
    setUploadFiles(prev => [...prev, ...newFiles]);
    handleUploadFiles(newFiles);
    setShowValidationDialog(false);
    setPendingFiles([]);
  }, [handleUploadFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check file limit
    if (uploadFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Cannot upload more than ${maxFiles} files at once. Please upload in smaller batches.`);
      return;
    }

    // Validate files
    const validation = validateFiles(acceptedFiles);
    
    if (validation.invalid.length > 0 || validation.warnings.length > 0) {
      // Show validation dialog for review
      setPendingFiles(acceptedFiles);
      setShowValidationDialog(true);
    } else {
      // All files are valid, proceed directly
      processValidatedFiles(validation.valid);
    }
  }, [uploadFiles.length, maxFiles, processValidatedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/epub+zip': ['.epub'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    },
    multiple: true,
    maxFiles
  });

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'uploading'));
  };

  const retryFailed = () => {
    const failedFiles = uploadFiles.filter(f => f.status === 'error');
    if (failedFiles.length > 0) {
      setUploadFiles(prev => prev.map(f => 
        f.status === 'error' 
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
          : f
      ));
      handleUploadFiles(failedFiles);
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/')) 
      return <Music className="h-5 w-5 text-emerald-500" />;
    if (file.type === 'application/pdf') 
      return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type === 'application/epub+zip') 
      return <BookOpen className="h-5 w-5 text-indigo-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  const formatMetadataDisplay = (metadata: BookMetadata) => {
    const items = [];
    if (metadata.title) items.push({ icon: BookOpen, label: 'Title', value: metadata.title });
    if (metadata.author) items.push({ icon: User, label: 'Author', value: metadata.author });
    if (metadata.series) {
      const seriesText = metadata.series_number 
        ? `${metadata.series} #${metadata.series_number}`
        : metadata.series;
      items.push({ icon: Tag, label: 'Series', value: seriesText });
    }
    if (metadata.genre) items.push({ icon: Tag, label: 'Genre', value: metadata.genre });
    if (metadata.publication_date) {
      const year = new Date(metadata.publication_date).getFullYear();
      items.push({ icon: Calendar, label: 'Year', value: year.toString() });
    }
    return items;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-muted-foreground" />;
      case 'validating':
        return <ShieldCheck className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadFile['status'], progress: number) => {
    switch (status) {
      case 'pending':
        return 'Pending...';
      case 'validating':
        return 'Validating...';
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'success':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          "hover:border-primary hover:bg-primary/5",
          isDragActive 
            ? "border-primary bg-primary/10 scale-105" 
            : "border-muted-foreground/25"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
            isDragActive ? "bg-primary/20 scale-110" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors duration-200",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          
          {isDragActive ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-primary">Drop your files here</p>
              <p className="text-sm text-muted-foreground">
                Files will be validated automatically
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-medium mb-1">
                  Drag & drop files here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse your files
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3" />
                <span>Advanced validation & metadata detection</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">PDF</span>
                <span className="px-2 py-1 bg-muted rounded">EPUB</span>
                <span className="px-2 py-1 bg-muted rounded">TXT</span>
                <span className="px-2 py-1 bg-muted rounded">MP3</span>
                <span className="px-2 py-1 bg-muted rounded">WAV</span>
                <span className="px-2 py-1 bg-muted rounded">M4A</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Maximum {maxFiles} files per upload
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File validation preview */}
      {pendingFiles.length > 0 && (
        <FileValidationPreview files={pendingFiles} />
      )}

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Loader2 className={cn("h-5 w-5", isUploading ? "animate-spin" : "hidden")} />
                Upload Progress
                <span className="text-sm font-normal text-muted-foreground">
                  ({uploadFiles.filter(f => f.status === 'success').length}/{uploadFiles.length} completed)
                </span>
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCompleted}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <X className="h-3 w-3" />
                  Clear Completed
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryFailed}
                  disabled={isUploading || !uploadFiles.some(f => f.status === 'error')}
                  className="gap-2"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry Failed
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {uploadFiles.map((uploadFile) => {
              const metadataItems = uploadFile.metadata ? formatMetadataDisplay(uploadFile.metadata) : [];
              
              return (
                <div key={uploadFile.id} className="space-y-4">
                  <div className="flex items-start gap-3">
                    {getFileIcon(uploadFile.file)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate pr-2">
                          {uploadFile.file.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(uploadFile.status)}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.round(uploadFile.file.size / 1024 / 1024 * 100) / 100} MB
                          </span>
                          {uploadFile.status !== 'uploading' && uploadFile.status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadFile.id)}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Status */}
                      <p className="text-xs text-muted-foreground">
                        {getStatusText(uploadFile.status, uploadFile.progress)}
                      </p>
                      
                      {/* Progress bar for uploading files */}
                      {uploadFile.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={uploadFile.progress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Error message */}
                      {uploadFile.error && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {uploadFile.error}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Detected Metadata */}
                      {metadataItems.length > 0 && uploadFile.status === 'success' && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Detected Metadata
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {metadataItems.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <item.icon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{item.label}:</span>
                                <span className="font-medium truncate">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Validation Dialog */}
      <FileValidationDialog
        files={pendingFiles}
        onValidFilesOnly={processValidatedFiles}
        onCancel={() => {
          setPendingFiles([]);
          setShowValidationDialog(false);
        }}
        trigger={null}
      />
      
      {showValidationDialog && (
        <div className="fixed inset-0 z-50" onClick={() => setShowValidationDialog(true)}>
          <FileValidationDialog
            files={pendingFiles}
            onValidFilesOnly={processValidatedFiles}
            onCancel={() => {
              setPendingFiles([]);
              setShowValidationDialog(false);
            }}
            trigger={<div />}
          />
        </div>
      )}
    </div>
  );
}