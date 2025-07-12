// components/file/file-upload.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, FileText, Headphones, XCircle } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete: () => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const supabase = createClient();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error("No file selected.");
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name);
    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload files.");
        setUploading(false);
        return;
      }

      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert file metadata into the database and return the created record
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

      toast.success("File uploaded successfully!");
      onUploadComplete();
    } catch (error: unknown) {
      console.error("Error uploading file:", error);
      toast.error(`Upload failed: ${(error instanceof Error) ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFileName("");
    }
  }, [onUploadComplete, supabase]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/epub+zip': ['.epub'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            <UploadCloud className="h-10 w-10 text-primary animate-bounce" />
            <p className="text-lg font-medium">Uploading {fileName}...</p>
            <Progress value={uploadProgress} className="w-full max-w-md" />
            <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop the files here ...</p>
            ) : (
              <p className="text-lg font-medium">Drag & drop a file here, or click to select one</p>
            )}
            <p className="text-sm text-muted-foreground">
              PDF, TXT, EPUB, MP3, WAV, OGG, M4A files are supported.
            </p>
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
            {(fileName.endsWith(".txt") || fileName.endsWith(".epub")) && <FileText className="h-5 w-5 text-blue-500" />}
            {(fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".ogg") || fileName.endsWith(".m4a")) && <Headphones className="h-5 w-5 text-emerald-500" />}
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setUploading(false)}>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}