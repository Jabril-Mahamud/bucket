// components/file/file-upload.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadCloud, FileText, Headphones, XCircle, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete: () => void;
}

interface UsageInfo {
  currentUsage?: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  limits?: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  planName?: string;
  remaining?: {
    uploads: number;
    storageGB: number;
  };
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [currentStep, setCurrentStep] = useState<"uploading" | "converting" | "done">("uploading");
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);

  const isConvertibleFile = (fileType: string) => {
    const supportedTypes = [
      'application/pdf',
      'application/epub+zip',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/html',
      'text/markdown'
    ];
    return supportedTypes.includes(fileType);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error("No file selected.");
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name);
    setUploading(true);
    setUploadProgress(0);
    setCurrentStep("uploading");
    setUsageError(null);
    setUsageInfo(null);

    try {
      if (isConvertibleFile(file.type)) {
        // Convert file to text instead of storing original
        setCurrentStep("converting");
        setUploadProgress(50);

        const formData = new FormData();
        formData.append('file', file);

        const convertResponse = await fetch('/api/convert', {
          method: 'POST',
          body: formData,
        });

        const convertResult = await convertResponse.json();

        if (!convertResponse.ok) {
          if (convertResponse.status === 429) {
            // Usage limit error
            setUsageError(convertResult.error);
            setUsageInfo(convertResult.usageInfo);
            return;
          }
          throw new Error(convertResult.error || 'Conversion failed');
        }

        if (!convertResult.success) {
          throw new Error(convertResult.error || 'Conversion failed');
        }

        setUploadProgress(100);
        setCurrentStep("done");
        toast.success(`File converted to text successfully! (${convertResult.textLength} characters)`);
        
        if (convertResult.usageInfo) {
          setUsageInfo(convertResult.usageInfo);
        }

      } else {
        // For audio files and other non-convertible files, use upload API
        setUploadProgress(25);

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          if (uploadResponse.status === 429) {
            // Usage limit error
            setUsageError(uploadResult.error);
            setUsageInfo(uploadResult.usageInfo);
            return;
          }
          throw new Error(uploadResult.error || 'Upload failed');
        }

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        setUploadProgress(100);
        setCurrentStep("done");
        toast.success("File uploaded successfully!");
        
        if (uploadResult.usageInfo) {
          setUsageInfo(uploadResult.usageInfo);
        }
      }

      onUploadComplete();
    } catch (error: unknown) {
      console.error("Error processing file:", error);
      toast.error(`Upload failed: ${(error instanceof Error) ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFileName("");
      setCurrentStep("uploading");
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/epub+zip': ['.epub'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/rtf': ['.rtf'],
      'text/html': ['.html'],
      'text/markdown': ['.md'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
    },
  });

  const getStepMessage = () => {
    switch (currentStep) {
      case "uploading":
        return "Uploading file...";
      case "converting":
        return "Converting to text...";
      case "done":
        return "Complete!";
      default:
        return "Processing...";
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case "uploading":
        return <UploadCloud className="h-10 w-10 text-primary animate-bounce" />;
      case "converting":
        return <RefreshCw className="h-10 w-10 text-primary animate-spin" />;
      case "done":
        return <FileText className="h-10 w-10 text-green-500" />;
      default:
        return <UploadCloud className="h-10 w-10 text-primary" />;
    }
  };

  const clearError = () => {
    setUsageError(null);
    setUsageInfo(null);
  };

  return (
    <div className="space-y-4">
      {/* Usage Limit Error */}
      {usageError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="font-medium">{usageError}</p>
              {usageInfo && (
                <div className="text-sm space-y-1">
                  <p><strong>Current Plan:</strong> {usageInfo.planName || 'Free'}</p>
                  {usageInfo.currentUsage && usageInfo.limits && (
                    <div className="space-y-1">
                      <p><strong>Monthly Usage:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Uploads: {usageInfo.currentUsage.uploads}/{usageInfo.limits.uploads === -1 ? 'Unlimited' : usageInfo.limits.uploads}</li>
                        <li>Storage: {usageInfo.currentUsage.storageGB.toFixed(2)}/{usageInfo.limits.storageGB}GB</li>
                      </ul>
                    </div>
                  )}
                  <p className="text-xs mt-2">Consider upgrading your plan for higher limits.</p>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <XCircle className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Usage Info */}
      {!usageError && usageInfo && !uploading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm space-y-1">
              <p><strong>Upload successful!</strong> Remaining this month:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                {usageInfo.remaining && (
                  <>
                    <li>Uploads: {Math.floor(usageInfo.remaining.uploads)}</li>
                    <li>Storage: {usageInfo.remaining.storageGB.toFixed(2)}GB</li>
                  </>
                )}
              </ul>
              <p className="text-xs text-muted-foreground mt-1">Plan: {usageInfo.planName || 'Free'}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? "border-primary bg-primary/5" 
            : usageError 
              ? "border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-50"
              : "border-gray-300 dark:border-gray-700 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} disabled={!!usageError} />
        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            {getStepIcon()}
            <p className="text-lg font-medium">{getStepMessage()}</p>
            <div className="w-full max-w-md space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground">
                {currentStep === "converting" ? `Converting: ${fileName}` : `Processing: ${fileName}`}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <UploadCloud className={`h-10 w-10 ${usageError ? 'text-muted-foreground' : 'text-muted-foreground'}`} />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here ...</p>
            ) : usageError ? (
              <p className="text-lg font-medium text-muted-foreground">Upload limit reached</p>
            ) : (
              <p className="text-lg font-medium">Drag & drop a file here, or click to select one</p>
            )}
            {!usageError && (
              <>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Documents:</strong> PDF, DOC, DOCX, TXT, EPUB, RTF, HTML, Markdown</p>
                  <p><strong>Audio:</strong> MP3, WAV, OGG, M4A</p>
                  <p className="text-xs text-blue-600">Documents will be automatically converted to searchable text</p>
                </div>
                <Button variant="outline" className="mt-4">
                  Select File
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {uploading && fileName && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            {fileName.endsWith(".pdf") && <FileText className="h-5 w-5 text-red-500" />}
            {(fileName.endsWith(".txt") || fileName.endsWith(".epub") || fileName.endsWith(".doc") || fileName.endsWith(".docx")) && <FileText className="h-5 w-5 text-blue-500" />}
            {(fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".ogg") || fileName.endsWith(".m4a")) && <Headphones className="h-5 w-5 text-emerald-500" />}
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{fileName}</span>
              <span className="text-xs text-muted-foreground">{getStepMessage()}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setUploading(false)}>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}