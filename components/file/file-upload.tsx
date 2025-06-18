"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const supabase = createClient();

  const handleUploadFiles = useCallback(async (filesToUpload: UploadFile[]) => {
    setIsUploading(true);
    
    for (const uploadFile of filesToUpload) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

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

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            filename: uploadFile.file.name,
            file_path: storageData.path,
            file_type: uploadFile.file.type,
            file_size: uploadFile.file.size
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
    handleUploadFiles(newFiles);
  }, [handleUploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/epub+zip': ['.epub'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
    },
    multiple: true
  });

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status === 'uploading'));
  };

  const retryFailed = () => {
    const failedFiles = uploadFiles.filter(f => f.status === 'error');
    if (failedFiles.length > 0) {
      setUploadFiles(prev => prev.map(f => 
        f.status === 'error' 
          ? { ...f, status: 'uploading' as const, progress: 0, error: undefined }
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

  return (
    <div className="space-y-6">
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
                Release to upload
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
              
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">PDF</span>
                <span className="px-2 py-1 bg-muted rounded">EPUB</span>
                <span className="px-2 py-1 bg-muted rounded">TXT</span>
                <span className="px-2 py-1 bg-muted rounded">MP3</span>
                <span className="px-2 py-1 bg-muted rounded">WAV</span>
                <span className="px-2 py-1 bg-muted rounded">M4A</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
          
          <CardContent className="space-y-4">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadFile.file)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate pr-2">
                        {uploadFile.file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {uploadFile.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {uploadFile.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {uploadFile.status === 'error' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {Math.round(uploadFile.file.size / 1024 / 1024 * 100) / 100} MB
                        </span>
                        {uploadFile.status !== 'uploading' && (
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
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Uploading...</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                      </div>
                    )}
                    
                    {uploadFile.status === 'success' && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Upload completed successfully
                      </p>
                    )}
                    
                    {uploadFile.error && (
                      <p className="text-xs text-red-500 mt-1">
                        ✗ {uploadFile.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}