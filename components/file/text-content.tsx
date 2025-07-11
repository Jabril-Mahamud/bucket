// components/file/text-content.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { FileWithProgressData, FileBookmark } from "@/lib/types";
import { BookmarkTooltip } from "@/components/bookmarks/bookmark-tooltip";

interface TextContentProps {
  fileId: string;
  fileData: FileWithProgressData;
  bookmarks: FileBookmark[];
  onTextSelection: () => void;
  onBookmarkClick: (bookmark: FileBookmark) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function TextContent({
  fileId,
  fileData,
  bookmarks,
  onTextSelection,
  onBookmarkClick,
  onContextMenu,
}: TextContentProps) {
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

  const renderTextContentWithBookmarksold = useCallback(() => {
    if (!textContent)
      return (
        <p className="text-muted-foreground">No text content available.</p>
      );

    // Get text bookmarks and sort by character position
    const textBookmarks = bookmarks
      .filter((bookmark) => bookmark.position_data.type === "text")
      .sort((a, b) => {
        const aPos = (a.position_data as { character: number }).character;
        const bPos = (b.position_data as { character: number }).character;
        return aPos - bPos;
      });

    if (textBookmarks.length === 0) {
      // No bookmarks, render normally
      const paragraphs = textContent.split("\n\n");
      return (
        <div className="space-y-6">
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
    }

    // Render text with highlighted bookmarks
    let currentPos = 0;
    const elements: React.ReactNode[] = [];
    let elementKey = 0;

    textBookmarks.forEach((bookmark) => {
      const startPos = (bookmark.position_data as { character: number })
        .character;
      const endPos = startPos + (bookmark.text_preview?.length || 50); // Fallback length

      // Add text before bookmark
      if (startPos > currentPos) {
        const textBefore = textContent.slice(currentPos, startPos);
        elements.push(<span key={`text-${elementKey++}`}>{textBefore}</span>);
      }

      // Add highlighted bookmark text
      const bookmarkText = textContent.slice(
        startPos,
        Math.min(endPos, textContent.length)
      );
      if (bookmarkText) {
        elements.push(
          <BookmarkTooltip
            key={`bookmark-${bookmark.id}`}
            bookmark={bookmark}
            onBookmarkClick={onBookmarkClick}
          >
            <span
              data-bookmark-id={bookmark.id}
              className={`cursor-pointer transition-all duration-200 hover:opacity-80 px-1 py-0.5 rounded-sm bg-${bookmark.color}-100 border-b-2 border-${bookmark.color}-400 text-${bookmark.color}-900 dark:bg-${bookmark.color}-800 dark:border-${bookmark.color}-500 dark:text-${bookmark.color}-100`}
              onClick={() => onBookmarkClick(bookmark)}
            >
              {bookmarkText}
            </span>
          </BookmarkTooltip>
        );
      }

      currentPos = Math.max(currentPos, endPos);
    });

    // Add remaining text after last bookmark
    if (currentPos < textContent.length) {
      const remainingText = textContent.slice(currentPos);
      elements.push(<span key={`text-${elementKey++}`}>{remainingText}</span>);
    }

    // Split into paragraphs while preserving highlights
    const result: React.ReactNode[] = [];
    let currentParagraph: React.ReactNode[] = [];
    let paragraphKey = 0;

    elements.forEach((element) => {
      if (typeof element === "string") {
        const paragraphs = element.split("\n\n");
        paragraphs.forEach((paragraph, index) => {
          if (index > 0) {
            // Start new paragraph
            result.push(
              <p
                key={`paragraph-${paragraphKey++}`}
                className="mb-6 last:mb-0 transition-colors duration-200"
              >
                {currentParagraph}
              </p>
            );
            currentParagraph = [];
          }
          if (paragraph) {
            currentParagraph.push(paragraph);
          }
        });
      } else {
        currentParagraph.push(element);
      }
    });

    // Add final paragraph
    if (currentParagraph.length > 0) {
      result.push(
        <p
          key={`paragraph-${paragraphKey++}`}
          className="mb-6 last:mb-0 transition-colors duration-200"
        >
          {currentParagraph}
        </p>
      );
    }

    return <div className="space-y-6">{result}</div>;
  }, [textContent, bookmarks, onBookmarkClick]);

  const renderTextContentWithBookmarks = useCallback(() => {
    if (!textContent)
      return (
        <p className="text-muted-foreground">No text content available.</p>
      );

    // Get text bookmarks and sort by character position
    const textBookmarks = bookmarks
      .filter((bookmark) => bookmark.position_data.type === "text")
      .sort((a, b) => {
        const aPos = (a.position_data as { character: number }).character;
        const bPos = (b.position_data as { character: number }).character;
        return aPos - bPos;
      });

    if (textBookmarks.length === 0) {
      // No bookmarks, render normally
      const paragraphs = textContent.split("\n\n");
      return (
        <div className="space-y-6">
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
    }

    // Create a map of bookmark positions
    const bookmarkMap = new Map<number, FileBookmark>();
    textBookmarks.forEach((bookmark) => {
      const startPos = (bookmark.position_data as { character: number }).character;
      bookmarkMap.set(startPos, bookmark);
    });

    // Split text by paragraphs first, then process each paragraph
    const paragraphs = textContent.split("\n\n");
    let currentCharacterOffset = 0;

    return (
      <div className="space-y-6">
        {paragraphs.map((paragraph, pIndex) => {
          const paragraphStart = currentCharacterOffset;
          const paragraphEnd = currentCharacterOffset + paragraph.length;
          
          // Find bookmarks within this paragraph
          const paragraphBookmarks = textBookmarks.filter((bookmark) => {
            const bookmarkPos = (bookmark.position_data as { character: number }).character;
            return bookmarkPos >= paragraphStart && bookmarkPos < paragraphEnd;
          });

          // Update character offset for next paragraph (+2 for \n\n)
          currentCharacterOffset = paragraphEnd + 2;

          if (paragraphBookmarks.length === 0) {
            // No bookmarks in this paragraph
            return (
              <p
                key={pIndex}
                className="mb-6 last:mb-0 transition-colors duration-200"
                id={`paragraph-${pIndex}`}
              >
                {paragraph}
              </p>
            );
          }

          // Render paragraph with bookmarks
          const elements: React.ReactNode[] = [];
          let currentPos = 0;

          paragraphBookmarks.forEach((bookmark, bIndex) => {
            const relativePos = (bookmark.position_data as { character: number }).character - paragraphStart;
            const endPos = relativePos + (bookmark.text_preview?.length || 50);

            // Add text before bookmark
            if (relativePos > currentPos) {
              elements.push(
                <span key={`text-${bIndex}`}>
                  {paragraph.slice(currentPos, relativePos)}
                </span>
              );
            }

            // Add highlighted bookmark text
            const bookmarkText = paragraph.slice(
              relativePos,
              Math.min(endPos, paragraph.length)
            );

            if (bookmarkText) {
              elements.push(
                <BookmarkTooltip
                  key={`bookmark-${bookmark.id}`}
                  bookmark={bookmark}
                  onBookmarkClick={onBookmarkClick}
                >
                  <span
                    data-bookmark-id={bookmark.id}
                    className="cursor-pointer transition-all duration-200 hover:opacity-80 px-1 py-0.5 rounded-sm bg-yellow-100 border-b-2 border-yellow-400 text-yellow-900 dark:bg-yellow-800 dark:border-yellow-500 dark:text-yellow-100"
                    onClick={() => onBookmarkClick(bookmark)}
                  >
                    {bookmarkText}
                  </span>
                </BookmarkTooltip>
              );
            }

            currentPos = Math.max(currentPos, endPos);
          });

          // Add remaining text in paragraph
          if (currentPos < paragraph.length) {
            elements.push(
              <span key={`text-end`}>
                {paragraph.slice(currentPos)}
              </span>
            );
          }

          return (
            <p
              key={pIndex}
              className="mb-6 last:mb-0 transition-colors duration-200"
              id={`paragraph-${pIndex}`}
            >
              {elements}
            </p>
          );
        })}
      </div>
    );
  }, [textContent, bookmarks, onBookmarkClick]);

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
      {renderTextContentWithBookmarks()}
    </div>
  );
}