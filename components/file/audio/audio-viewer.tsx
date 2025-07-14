// components/file/audio/audio-viewer.tsx
"use client";

import { useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Headphones, 
  BarChart3
} from "lucide-react";
import { FileWithProgressData } from "@/lib/types";
import { AudioPlayer } from "./audio-player";

interface AudioViewerProps {
  fileData: FileWithProgressData;
}

export function AudioViewer({ fileData }: AudioViewerProps) {
  const audioPlayerRef = useRef<{ seek: (time: number) => void } | null>(null);

  const handleSeekCallback = useCallback((seekFn: (time: number) => void) => {
    audioPlayerRef.current = { seek: seekFn };
  }, []);

  // Helper function to safely check progress
  const hasProgress = fileData.progress && 
    fileData.progress.progress_percentage !== null && 
    fileData.progress.progress_percentage > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                  <Headphones className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Audio Player</span>
                    <Badge variant="default" className="bg-emerald-600">
                      Audio
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {fileData.file_size
                      ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100
                      : 0}{" "}
                    MB
                  </p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <AudioPlayer
              audioFile={fileData}
              onSeek={handleSeekCallback}
            />

            {hasProgress && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Last saved progress
                  </span>
                  <span className="font-medium">
                    {Math.round(fileData.progress!.progress_percentage!)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}