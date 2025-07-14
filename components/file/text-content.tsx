// components/file/text-content.tsx
"use client";

import { useState, useEffect, forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { FileWithProgressData } from "@/lib/types";

interface TextContentProps {
  fileId: string;
  fileData: FileWithProgressData;
  onTextSelection: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const TextContent = forwardRef<HTMLDivElement, TextContentProps>(
  function TextContent({
    fileId,
    fileData,
    onTextSelection,
    onContextMenu,
  }, ref) {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchTextContent = async () => {
        try {
          setLoadingText(true);
          
          // First try to get text from fileData
          if (fileData.text_content) {
            setTextContent(fileData.text_content);
            setLoadingText(false);
            return;
          }

          // If not available, fetch from API
          const response = await fetch(`/api/files/${fileId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();
          setTextContent(text);
        } catch (e) {
          console.error("Error fetching text content:", e);
          setError("Failed to load text content.");
        } finally {
          setLoadingText(false);
        }
      };

      fetchTextContent();
    }, [fileId, fileData.text_content]);

    const renderTextContent = () => {
      if (!textContent)
        return (
          <p className="text-muted-foreground">No text content available.</p>
        );

      const paragraphs = textContent.split("\n\n");
      return (
        <div className="space-y-6" ref={ref}>
          {paragraphs.map((paragraph, pIndex) => (
            <p
              key={pIndex}
              className="mb-6 last:mb-0 transition-colors duration-200"
              id={`paragraph-${pIndex}`}
            >
              {paragraph}
            </p>
          ))}
        </div>
      );
    };

    if (loadingText) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium">Loading text...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
          <Card className="border-2">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <FileText className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold">Error loading content</h3>
              <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div
        className="prose prose-lg dark:prose-invert max-w-none min-h-[70vh] p-4 md:p-8 bg-background border rounded-lg shadow-sm cursor-text"
        style={{
          lineHeight: "1.8",
          fontSize: "18px",
          fontFamily: "ui-serif, Georgia, serif",
        }}
        onMouseUp={onTextSelection}
        onTouchEnd={onTextSelection}
        onContextMenu={onContextMenu}
      >
        {renderTextContent()}
      </div>
    );
  }
);