"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  FileText,
  Search,
  BookOpen,
  Copy,
  Check,
  Eye,
  EyeOff,
  Type,
  FileType,
  Calendar,
  HardDrive
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseFile } from "@/lib/types";

interface FileViewerProps {
  fileId: string;
}

export function FileViewer({ fileId }: FileViewerProps) {
  const [fileData, setFileData] = useState<DatabaseFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOriginalInfo, setShowOriginalInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: file, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .eq("user_id", user.id)
          .single();

        if (fileError) throw fileError;

        setFileData(file);
      } catch (error) {
        console.error("Error fetching file:", error);
        router.push("/library");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileId, router, supabase]);

  // Highlight search terms in text
  const highlightedText = useMemo(() => {
    if (!fileData?.text_content || !searchTerm.trim()) {
      return fileData?.text_content || "";
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return fileData.text_content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }, [fileData?.text_content, searchTerm]);

  const downloadTextFile = async () => {
    if (!fileData?.text_content) return;

    const blob = new Blob([fileData.text_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!fileData?.text_content) return;

    try {
      await navigator.clipboard.writeText(fileData.text_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="h-6 w-6" />;
    
    if (fileType === 'application/pdf') 
      return <FileText className="h-6 w-6 text-red-500" />;
    if (fileType === 'application/epub+zip') 
      return <BookOpen className="h-6 w-6 text-indigo-500" />;
    if (fileType.includes('word') || fileType === 'application/rtf') 
      return <FileType className="h-6 w-6 text-blue-500" />;
    
    return <FileText className="h-6 w-6 text-slate-500" />;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Converted</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg font-medium">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Document not found</h2>
        <p className="text-muted-foreground mb-6">
          The requested document could not be located
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Button>
          </Link>
          <Button variant="outline" onClick={downloadTextFile} className="gap-2">
            <Download className="h-4 w-4" />
            Download Text
          </Button>
          <Button variant="outline" onClick={copyToClipboard} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {getFileTypeIcon(fileData.original_file_type)}
            <h1 className="text-3xl font-bold tracking-tight line-clamp-2">
              {fileData.filename}
            </h1>
            {getStatusBadge(fileData.conversion_status)}
          </div>
          
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(fileData.uploaded_at)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              {fileData.text_content?.length.toLocaleString() || 0} characters
            </span>
            {fileData.original_file_size && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  {formatFileSize(fileData.original_file_size)} original
                </span>
              </>
            )}
          </div>

          {/* Original File Info Toggle */}
          {fileData.original_filename && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginalInfo(!showOriginalInfo)}
              className="gap-2"
            >
              {showOriginalInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showOriginalInfo ? 'Hide' : 'Show'} Original File Info
            </Button>
          )}

          {/* Original File Info */}
          {showOriginalInfo && fileData.original_filename && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Original File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Original Name:</strong> {fileData.original_filename}</div>
                <div><strong>Original Type:</strong> {fileData.original_file_type}</div>
                <div><strong>Original Size:</strong> {formatFileSize(fileData.original_file_size)}</div>
                <div><strong>Conversion Status:</strong> {fileData.conversion_status}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search within this document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-muted-foreground">
              Search results will be highlighted in yellow below
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Text Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fileData.text_content ? (
            <div 
              className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed p-6 bg-muted/30 rounded-lg border max-h-[70vh] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No text content available</p>
              {fileData.conversion_status !== 'completed' && (
                <p className="text-sm mt-2">
                  Text conversion may still be in progress
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}