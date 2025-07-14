// components/file/viewer/text-viewer.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  BookOpen,
  Headphones,
  Volume2,
  Loader2,
  Copy,
  Search
} from "lucide-react";
import { FileWithProgressData } from "@/lib/types";
import { useTTS } from "@/hooks/useTTS";
import { AudioPlayer } from "../audio/audio-player";
import { TextContent } from "../text-content";
import { toast } from "sonner";

interface TextViewerProps {
  fileId: string;
  fileData: FileWithProgressData;
  relatedAudioFile?: FileWithProgressData;
  onRefresh: () => void;
}

export function TextViewer({ 
  fileId, 
  fileData, 
  relatedAudioFile, 
  onRefresh 
}: TextViewerProps) {
  const [selectedText, setSelectedText] = useState<string>("");

  // We'll use this ref to get the actual text content element from TextContent
  const textContentRef = useRef<HTMLDivElement | null>(null);

  const { convertToSpeech, isLoading: isTtsLoading } = useTTS();

  // Improved text selection handler that works with any text container
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectedText("");
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setSelectedText("");
      return;
    }

    setSelectedText(selectedText);
  }, []);

  const handleCopyText = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      toast.success("Text copied to clipboard");
    }
  };

  const handleConvertToAudio = async () => {
    let textToConvert = fileData.text_content;

    if (!textToConvert && fileData.file_type === "text/plain") {
      try {
        const response = await fetch(`/api/files/${fileData.id}`);
        if (response.ok) {
          textToConvert = await response.text();
        }
      } catch (error) {
        console.error("Error reading text file:", error);
        toast.error("Failed to read text file");
        return;
      }
    }

    if (!textToConvert || textToConvert.trim().length === 0) {
      toast.error("No text content available to convert to audio.");
      return;
    }

    const toastId = toast.loading("Converting to audio...", {
      description: `File: ${fileData.filename}`,
    });

    try {
      const result = await convertToSpeech(textToConvert, {
        fileId: fileData.id,
        autoPlay: false,
      });

      if (result.audioFileId) {
        toast.success("Audio conversion complete!", {
          id: toastId,
          description: "The audio file has been created and is ready to play.",
        });

        setTimeout(() => {
          onRefresh();
        }, 1000);
      } else {
        toast.error("Audio conversion failed", {
          id: toastId,
          description: "No audio file was created. Please try again.",
        });
      }
    } catch (error) {
      console.error("TTS conversion error:", error);
      toast.error("Audio conversion failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  // Callback to receive the text content ref from TextContent component
  const handleTextContentRef = useCallback((ref: HTMLDivElement | null) => {
    textContentRef.current = ref;
  }, []);

  return (
    <div className="relative">
      {/* Audio Player */}
      {relatedAudioFile && (
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto p-3 md:p-4">
            <AudioPlayer audioFile={relatedAudioFile} />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="bg-blue-600">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Text
                </Badge>
                {relatedAudioFile && (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-600"
                  >
                    <Headphones className="h-3 w-3 mr-1" />
                    Audio Available
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {!relatedAudioFile && (
                  <Button
                    onClick={handleConvertToAudio}
                    disabled={isTtsLoading}
                    size="sm"
                    className="gap-2"
                  >
                    {isTtsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        <span>Create Audio</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Selection Info */}
              {selectedText && (
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Selected Text</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedText.length} characters
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground italic line-clamp-2">
                    &quot;{selectedText}&quot;
                  </p>
                </div>
              )}
            </div>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div>
                  <TextContent
                    fileId={fileId}
                    fileData={fileData}
                    onTextSelection={handleTextSelection}
                    onContextMenu={() => {}}
                    ref={handleTextContentRef}
                  />
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-64">
                {/* Text selection actions */}
                {selectedText && (
                  <>
                    <ContextMenuItem
                      onClick={handleCopyText}
                      className="gap-2 cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Text
                    </ContextMenuItem>
                  </>
                )}

                {/* General actions */}
                <ContextMenuItem className="gap-2 cursor-pointer">
                  <Search className="h-4 w-4" />
                  Search in Document
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        </div>
      </div>
    </div>
  );
}