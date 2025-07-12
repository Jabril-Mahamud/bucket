// components/file/viewer-header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

interface ViewerHeaderProps {
  filename: string;
  onDownload: () => void;
}

export function ViewerHeader({ filename, onDownload }: ViewerHeaderProps) {
  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/library">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Library</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <h1 className="text-lg md:text-2xl font-bold tracking-tight line-clamp-2">
            {filename}
          </h1>
        </div>
      </div>
    </div>
  );
}