// components/file/enhanced-file-upload.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  UploadCloud, 
  FileText, 
  Headphones, 
  XCircle, 
  RefreshCw, 
  AlertTriangle,
  Zap,
  ArrowRight 
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useUsage } from "@/lib/stripe/contexts/usage-context";
import { UsageGate } from "../billing/pricing/usage/usage-gate";
import { UsageWarning } from "../billing/pricing/usage/usage-warning";

interface EnhancedFileUploadProps {
  onUploadComplete: () => void;
  className?: string;
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
    uploads?: number;
    storageGB?: number;
  };
}

interface UploadError {
  type: 'UPLOAD_LIMIT_EXCEEDED' | 'STORAGE_LIMIT_EXCEEDED' | 'UPLOAD_FAILED' | 'INTERNAL_ERROR';
  message: string;
  usageInfo?: UsageInfo;
}

export function EnhancedFileUpload({ 
  onUploadComplete, 
  className 
}: EnhancedFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [currentStep, setCurrentStep] = useState<"uploading" | "processing" | "done">("uploading");
  const [error, setError] = useState<UploadError | null>(null);
  
  const { 
    usage, 
    checkCanUpload, 
    refreshUsage, 
    getUsagePercentage, 
    isNearLimit 
  } = useUsage();

  const isConvertibleFile = useCallback((fileType: string) => {
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
  }, []);

  const handleUploadError = useCallback((error: UploadError) => {
    setError(error);
    
    // Show appropriate toast based on error type
    switch (error.type) {
      case 'UPLOAD_LIMIT_EXCEEDED':
        toast.error("Upload limit reached", {
          description: error.message,
          action: usage?.planName === 'free' ? {
            label: "Upgrade Plan",
            onClick: () => window.open('/pricing', '_blank')
          } : undefined
        });
        break;
      case 'STORAGE_LIMIT_EXCEEDED':
        toast.error("Storage limit exceeded", {
          description: error.message,
          action: usage?.planName === 'free' ? {
            label: "Upgrade Plan",
            onClick: () => window.open('/pricing', '_blank')
          } : undefined
        });
        break;
      default:
        toast.error("Upload failed", {
          description: error.message
        });
    }
  }, [usage]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error("No file selected.");
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name);
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setCurrentStep("uploading");

    try {
      // Pre-flight usage checks
      const uploadCheck = checkCanUpload(file.size);
      if (!uploadCheck.allowed) {
        throw new Error(uploadCheck.reason);
      }

      const formData = new FormData();
      
      // Determine which endpoint to use based on file type
      let endpoint = '/api/files/upload';
      let isTextConversion = false;
      
      if (isConvertibleFile(file.type)) {
        endpoint = '/api/convert';
        isTextConversion = true;
        setCurrentStep("processing");
        setUploadProgress(25);
        formData.append('file', file);
      } else {
        // For audio files and other non-convertible files
        setUploadProgress(25);
        formData.append('file', file);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const uploadError: UploadError = {
          type: result.errorType || 'UPLOAD_FAILED',
          message: result.error || 'Upload failed',
          usageInfo: result.usageInfo
        };
        throw uploadError;
      }

      setUploadProgress(100);
      setCurrentStep("done");

      // Success message based on file type
      if (isTextConversion) {
        toast.success(`File converted successfully!`, {
          description: `${result.textLength || 0} characters extracted`
        });
      } else {
        toast.success("File uploaded successfully!");
      }

      // Refresh usage data and notify parent
      await refreshUsage();
      onUploadComplete();

    } catch (error: unknown) {
      console.error("Error processing file:", error);
      if (typeof error === "object" && error !== null && "type" in error) {
        handleUploadError(error as UploadError);
      } else if (typeof error === "object" && error !== null && "message" in error) {
        handleUploadError({
          type: 'UPLOAD_FAILED',
          message: (error as { message?: string }).message || "Unknown error occurred"
        });
      } else {
        handleUploadError({
          type: 'UPLOAD_FAILED',
          message: "Unknown error occurred"
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFileName("");
      setCurrentStep("uploading");
    }
  }, [onUploadComplete, checkCanUpload, refreshUsage, isConvertibleFile, handleUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxFiles: 1,
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
    disabled: uploading
  });

  const getStepMessage = () => {
    switch (currentStep) {
      case "uploading":
        return "Uploading file...";
      case "processing":
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
      case "processing":
        return <RefreshCw className="h-10 w-10 text-primary animate-spin" />;
      case "done":
        return <FileText className="h-10 w-10 text-green-500" />;
      default:
        return <UploadCloud className="h-10 w-10 text-primary" />;
    }
  };

  const showUploadWarnings = isNearLimit('uploads', 70) || isNearLimit('storage', 70);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Usage Warnings */}
      {showUploadWarnings && (
        <div className="space-y-2">
          {isNearLimit('uploads', 70) && <UsageWarning type="uploads" />}
          {isNearLimit('storage', 70) && <UsageWarning type="storage" />}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error.message}</span>
              {(error.type === 'UPLOAD_LIMIT_EXCEEDED' || error.type === 'STORAGE_LIMIT_EXCEEDED') && 
               usage?.planName === 'free' && (
                <Button asChild size="sm" variant="outline" className="ml-2">
                  <Link href="/pricing" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Upgrade
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Upload Area */}
      <UsageGate 
        type="uploads" 
        fallback={
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You&apos;ve reached your monthly upload limit.
              {usage?.planName === 'free' && (
                <Button asChild variant="link" className="p-0 h-auto ml-1">
                  <Link href="/pricing">Upgrade your plan</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        }
      >
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 dark:border-gray-700 hover:border-primary'
            }
            ${uploading ? 'pointer-events-none opacity-75' : ''}
          `}
        >
          <input {...getInputProps()} />
          
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
                  {currentStep === "processing" ? `Converting: ${fileName}` : `Processing: ${fileName}`}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium">Drag & drop a file here, or click to select</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Documents:</strong> PDF, DOC, DOCX, TXT, EPUB, RTF, HTML, Markdown</p>
                    <p><strong>Audio:</strong> MP3, WAV, OGG, M4A</p>
                    <p className="text-xs text-blue-600">Documents will be automatically converted to searchable text</p>
                  </div>
                </>
              )}
              <Button variant="outline" className="mt-4" disabled={uploading}>
                Select File
              </Button>
            </div>
          )}
        </div>
      </UsageGate>

      {/* File Processing Indicator */}
      {uploading && fileName && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            {fileName.match(/\.(pdf|doc|docx|txt|epub|rtf|html|md)$/i) && 
              <FileText className="h-5 w-5 text-blue-500" />}
            {fileName.match(/\.(mp3|wav|ogg|m4a)$/i) && 
              <Headphones className="h-5 w-5 text-emerald-500" />}
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{fileName}</span>
              <span className="text-xs text-muted-foreground">{getStepMessage()}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setUploading(false);
              setFileName("");
              setError(null);
            }}
            disabled={currentStep === "processing"}
          >
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Usage Summary */}
      {usage && !uploading && (
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>
            Monthly usage: {usage.current.uploads}/{usage.limits.uploads === -1 ? '∞' : usage.limits.uploads} uploads, 
            {' '}{usage.current.storageGB.toFixed(2)}/{usage.limits.storageGB}GB storage
          </p>
          {usage.planName === 'free' && getUsagePercentage('uploads') > 60 && (
            <p className="text-blue-600">
              <Link href="/pricing" className="hover:underline">
                Upgrade for more uploads and storage →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}