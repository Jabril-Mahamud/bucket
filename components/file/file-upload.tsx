"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, File, CheckCircle, XCircle, Loader2 } from "lucide-react";
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
            ? { ...f, progress: 50 }
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

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, TXT, EPUB, MP3, WAV, M4A, AAC, OGG
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Upload Progress</CardTitle>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCompleted}
                disabled={isUploading}
              >
                Clear Completed
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryFailed}
                disabled={isUploading || !uploadFiles.some(f => f.status === 'error')}
              >
                Retry Failed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      {uploadFile.file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {Math.round(uploadFile.file.size / 1024 / 1024 * 100) / 100} MB
                      </span>
                    </div>
                  </div>
                  
                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="h-2" />
                  )}
                  
                  {uploadFile.error && (
                    <p className="text-sm text-red-500 ml-7">
                      {uploadFile.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}