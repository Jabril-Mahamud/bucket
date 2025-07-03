"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
  BookOpen,
  X,
  RotateCcw,
  FileType
} from "lucide-react";
import { cn, UploadFile } from "@/lib/utils";

// Supported file types for text conversion
const SUPPORTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/epub+zip': ['.epub'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/rtf': ['.rtf'],
  'text/html': ['.html'],
  'text/markdown': ['.md']
};

export function FileUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadFiles = useCallback(async (filesToUpload: UploadFile[]) => {
    setIsUploading(true);
    
    for (const uploadFile of filesToUpload) {
      try {
        // Update progress to show conversion starting
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 10, status: 'uploading' as const }
            : f
        ));

        // Create form data for the conversion API
        const formData = new FormData();
        formData.append('file', uploadFile.file);

        // Update progress to show file being processed
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 30 }
            : f
        ));

        // Call the conversion API
        const response = await fetch('/api/convert', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Conversion failed');
        }

        const result = await response.json();

        // Update progress to show conversion completing
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 90 }
            : f
        ));

        // Mark as complete
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                progress: 100, 
                status: 'success' as const,
                convertedTextLength: result.textLength
              }
            : f
        ));

      } catch (error) {
        console.error('Conversion error:', error);
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Conversion failed'
              }
            : f
        ));
      }
    }
    
    setIsUploading(false);
    onUploadComplete?.();
  }, [onUploadComplete]);

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
    accept: SUPPORTED_TYPES,
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
    if (file.type === 'application/pdf') 
      return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type === 'application/epub+zip') 
      return <BookOpen className="h-5 w-5 text-indigo-500" />;
    if (file.type.includes('word') || file.type === 'application/rtf') 
      return <FileType className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                Files will be converted to text automatically
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-medium mb-1">
                  Upload documents for text conversion
                </p>
                <p className="text-sm text-muted-foreground">
                  Files will be converted to searchable text and saved to your library
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">PDF</span>
                <span className="px-2 py-1 bg-muted rounded">EPUB</span>
                <span className="px-2 py-1 bg-muted rounded">DOC/DOCX</span>
                <span className="px-2 py-1 bg-muted rounded">TXT</span>
                <span className="px-2 py-1 bg-muted rounded">RTF</span>
                <span className="px-2 py-1 bg-muted rounded">HTML</span>
                <span className="px-2 py-1 bg-muted rounded">Markdown</span>
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
                Text Conversion Progress
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
                          {formatFileSize(uploadFile.file.size)}
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
                          <span>
                            {uploadFile.progress < 30 ? 'Uploading...' :
                             uploadFile.progress < 90 ? 'Converting to text...' :
                             'Finalizing...'}
                          </span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                      </div>
                    )}
                    
                    {uploadFile.status === 'success' && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Converted to text successfully
                        {uploadFile.convertedTextLength && (
                          <span className="ml-2 text-muted-foreground">
                            ({uploadFile.convertedTextLength.toLocaleString()} characters)
                          </span>
                        )}
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