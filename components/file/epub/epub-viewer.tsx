"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  BookOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileWithProgressData } from "@/lib/types";
import { useFileProgress } from "@/hooks/useFileProgress";
import ePub from "epubjs";

interface EPUBViewerProps {
  fileId: string;
  fileData: FileWithProgressData;
}

export function EPUBViewer({ fileId, fileData }: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const [location, setLocation] = useState<string | number>(
    fileData.progress?.last_position || 0
  );
  const [progressPercentage, setProgressPercentage] = useState(
    fileData.progress?.progress_percentage || 0
  );
  const [loading, setLoading] = useState(true);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const { updateProgress, updateProgressImmediate, isUpdating } =
    useFileProgress();

  const saveProgress = useCallback(
    async (cfi: string | number, percentage: number, immediate = false) => {
      try {
        if (immediate) {
          await updateProgressImmediate(fileId, percentage, cfi.toString());
        } else {
          await updateProgress(fileId, percentage, cfi.toString());
        }
      } catch (error) {
        console.error("Error saving EPUB progress:", error);
      }
    },
    [fileId, updateProgress, updateProgressImmediate]
  );

  useEffect(() => {
    const loadBook = async () => {
      if (!viewerRef.current) return;

      setLoading(true);
      try {
        console.log(`Attempting to fetch EPUB file for fileId: ${fileId}`);
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch EPUB file. Status: ${response.status}, Response: ${errorText}`);
          throw new Error(`Failed to fetch EPUB file: ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log(`Successfully fetched EPUB blob. Size: ${blob.size} bytes`);
        const url = URL.createObjectURL(blob);
        console.log(`Created object URL: ${url}`);

        bookRef.current = ePub(url);
        renditionRef.current = bookRef.current.renderTo(viewerRef.current, {
          width: "100%",
          height: "600px",
          flow: "paginated",
          snap: true,
        });

        renditionRef.current.on("rendered", (section: any, view: any) => {
          // This event fires when a new section is rendered
          // You might want to update progress here based on the section
        });

        renditionRef.current.on("relocated", (newLocation: any) => {
          const cfi = newLocation.start.cfi;
          const percentage = newLocation.start.percentage * 100;
          setLocation(cfi);
          setProgressPercentage(percentage);
          saveProgress(cfi, percentage);

          setAtStart(newLocation.atStart);
          setAtEnd(newLocation.atEnd);
        });

        renditionRef.current.on("started", () => {
          if (location) {
            renditionRef.current.display(location);
          } else {
            renditionRef.current.display();
          }
          setLoading(false);
        });

        renditionRef.current.on("ready", () => {
          setLoading(false);
        });

        renditionRef.current.on("displayError", (error: any) => {
          console.error("EPUB display error:", error);
          setLoading(false);
        });

        // Clean up on unmount
        return () => {
          if (bookRef.current) {
            bookRef.current.destroy();
          }
          if (url) {
            URL.revokeObjectURL(url);
          }
        };
      } catch (error) {
        console.error("Error loading EPUB:", error);
        setLoading(false);
        // Optionally, display an error message to the user
        console.error("EPUB loading failed:", error);
      }
    };

    loadBook();
  }, [fileId, saveProgress]);

  const nextPage = () => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  };

  const prevPage = () => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  };

  const openInNewTab = () => {
    window.open(`/api/files/${fileId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium">Loading EPUB...</p>
            <p className="text-sm text-muted-foreground">
              Preparing your book for reading
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* EPUB Info Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                EPUB Document
                <Badge variant="default" className="bg-blue-600">
                  EPUB
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {fileData.file_size
                  ? Math.round((fileData.file_size / 1024 / 1024) * 100) / 100
                  : 0}{" "}
                MB
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          {progressPercentage > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reading Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}% complete
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={openInNewTab}
              className="w-full gap-3 h-12"
            >
              <ExternalLink className="h-5 w-5" />
              Open EPUB in New Tab
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Opens the raw EPUB file in a new tab.
          </div>
        </CardContent>
      </Card>

      {/* Embedded EPUB Viewer */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Embedded Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={viewerRef}
            className="w-full h-[600px] border-2 border-dashed border-muted rounded-lg overflow-hidden bg-muted/30"
          >
            {/* EPUB.js will render here */}
          </div>
          <div className="flex justify-between mt-4">
            <Button onClick={prevPage} disabled={atStart}>
              <ChevronLeft className="h-5 w-5" /> Previous
            </Button>
            <Button onClick={nextPage} disabled={atEnd}>
              Next <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
