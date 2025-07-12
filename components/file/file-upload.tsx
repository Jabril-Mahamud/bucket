// components/file/file-upload.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileText, Headphones, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [currentStep, setCurrentStep] = useState<"uploading" | "converting" | "done">("uploading");
  const supabase = createClient();

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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files.");
        setUploading(false);
        return;
      }

      // Check if file can be converted to text
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

        if (!convertResponse.ok) {
          const errorData = await convertResponse.json();
          throw new Error(errorData.error || 'Conversion failed');
        }

        const convertResult = await convertResponse.json();
        
        if (!convertResult.success) {
          throw new Error(convertResult.error || 'Conversion failed');
        }

        setUploadProgress(100);
        setCurrentStep("done");
        toast.success(`File converted to text successfully! (${convertResult.textLength} characters)`);

      } else {
        // For audio files and other non-convertible files, upload normally
        const filePath = `${user.id}/${Date.now()}-${file.name}`;

        setUploadProgress(25);

        const { error: uploadError } = await supabase.storage
          .from("user-files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setUploadProgress(75);

        // Insert file metadata into the database
        const { data: fileRecord, error: dbError } = await supabase
          .from("files")
          .insert({
            user_id: user.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
          })
          .select()
          .single();

        if (dbError) {
          // Clean up storage if database insert fails
          await supabase.storage
            .from("user-files")
            .remove([filePath]);
          throw dbError;
        }

        if (!fileRecord) {
          throw new Error("Failed to create file record");
        }

        setUploadProgress(100);
        setCurrentStep("done");
        toast.success("File uploaded successfully!");
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
  }, [onUploadComplete, supabase]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
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

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
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
                {currentStep === "converting" ? `Converting: ${fileName}` : `Processing: ${fileName}`}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here ...</p>
            ) : (
              <p className="text-lg font-medium">Drag & drop a file here, or click to select one</p>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Documents:</strong> PDF, DOC, DOCX, TXT, EPUB, RTF, HTML, Markdown</p>
              <p><strong>Audio:</strong> MP3, WAV, OGG, M4A</p>
              <p className="text-xs text-blue-600">Documents will be automatically converted to searchable text</p>
            </div>
            <Button variant="outline" className="mt-4">
              Select File
            </Button>
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