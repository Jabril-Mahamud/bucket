// components/file/file-viewer.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useFileData } from "@/hooks/useFileData";
import { AudioViewer } from "../audio/audio-viewer";
import { TextViewer } from "./text-viewer";
import { ViewerHeader } from "./viewer-header";
import { toast } from "sonner";

export function FileViewer({ fileId }: { fileId: string }) {
  
  const {
    fileData,
    relatedAudioFile,
    loading,
    error,
    refetch
  } = useFileData(fileId);

  const downloadFile = async () => {
    if (!fileData) return;
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="text-center py-12 px-4">
        <FileText className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">File Not Found</h2>
        <p className="text-muted-foreground mb-6">
          {error || "The requested file could not be located."}
        </p>
        <Link href="/library">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </Link>
      </div>
    );
  }

  const isAudio = fileData.file_type.startsWith("audio/");
  const isText = 
    fileData.file_type === "text/plain" ||
    fileData.file_type === "application/epub+zip";

  return (
    <div className="min-h-screen bg-background">
      <ViewerHeader 
        filename={fileData.filename}
        onDownload={downloadFile}
      />

      {isAudio && <AudioViewer fileData={fileData} />}
      {isText && (
        <TextViewer 
          fileId={fileId}
          fileData={fileData}
          relatedAudioFile={relatedAudioFile}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}