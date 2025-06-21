// components/file/file-validation-dialog.tsx
"use client";

import { JSX, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Headphones,
  BookOpen,
  File,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
  FileType,
  ExternalLink,
  Zap,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  validateFiles, 
  SUPPORTED_FORMATS, 
  FileValidationResult 
} from "@/lib/file-validation";

interface FileValidationDialogProps {
  files: File[];
  onValidFilesOnly: (validFiles: File[]) => void;
  onCancel: () => void;
  trigger?: React.ReactNode;
}

export function FileValidationDialog({ 
  files, 
  onValidFilesOnly, 
  onCancel,
  trigger 
}: FileValidationDialogProps) {
  const [open, setOpen] = useState(false);
  
  const validation = validateFiles(files);
  const { valid, invalid, totalSize, warnings } = validation;

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): JSX.Element => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext || '')) {
      return <Headphones className="h-4 w-4 text-emerald-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (['epub', 'txt'].includes(ext || '')) {
      return <BookOpen className="h-4 w-4 text-indigo-500" />;
    }
    return <File className="h-4 w-4 text-slate-500" />;
  };

  const getSupportLevelBadge = (level: FileValidationResult['supportLevel']): JSX.Element => {
    switch (level) {
      case 'full':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Full Support</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partial Support</Badge>;
      case 'experimental':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Experimental</Badge>;
      case 'unsupported':
        return <Badge variant="destructive">Unsupported</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleProceedWithValid = (): void => {
    onValidFilesOnly(valid);
    setOpen(false);
  };

  const handleCancel = (): void => {
    onCancel();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="outline" className="gap-2">
            <FileType className="h-4 w-4" />
            Validate Files
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            File Validation Results
          </DialogTitle>
          <DialogDescription>
            Review file compatibility and format support before uploading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{valid.length}</p>
                    <p className="text-sm text-muted-foreground">Valid Files</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{invalid.length}</p>
                    <p className="text-sm text-muted-foreground">Invalid Files</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
                    <p className="text-sm text-muted-foreground">Total Size</p>
                  </div>
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="results">Validation Results</TabsTrigger>
              <TabsTrigger value="supported">Supported Formats</TabsTrigger>
              <TabsTrigger value="help">Help & Tips</TabsTrigger>
            </TabsList>
            
            <TabsContent value="results" className="space-y-4">
              {/* Valid Files */}
              {valid.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      Valid Files ({valid.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {valid.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span className="text-sm font-medium">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.name.split('.').pop()?.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invalid Files */}
              {invalid.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Invalid Files ({invalid.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {invalid.map(({ file, validation }, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.name)}
                              <span className="text-sm font-medium">{file.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {file.name.split('.').pop()?.toUpperCase()}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          
                          {validation.errors.map((error, errorIndex) => (
                            <Alert key={errorIndex} variant="destructive" className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                          ))}
                          
                          {validation.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-blue-600 mb-1">Suggestions:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {validation.suggestions.map((suggestion, suggestionIndex) => (
                                  <li key={suggestionIndex} className="text-xs text-blue-600">{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="supported" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(SUPPORTED_FORMATS).map(([key, format]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {format.category === 'Document' ? (
                            <BookOpen className={cn("h-4 w-4", format.iconColor)} />
                          ) : (
                            <Headphones className={cn("h-4 w-4", format.iconColor)} />
                          )}
                          {format.displayName}
                        </CardTitle>
                        {getSupportLevelBadge(format.supportLevel)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {format.extensions.map(ext => (
                          <Badge key={ext} variant="outline" className="text-xs">
                            .{ext}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Max size: {format.maxSize}MB
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium mb-1">Features:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {format.features.map((feature, index) => (
                            <li key={index} className="text-xs text-muted-foreground">{feature}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {format.limitations && (
                        <div>
                          <p className="text-xs font-medium mb-1 text-orange-600">Limitations:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {format.limitations.map((limitation, index) => (
                              <li key={index} className="text-xs text-orange-600">{limitation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="help" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Quick Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">For best results:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Use PDF for documents with complex layouts</li>
                        <li>Use EPUB for reflowable text content</li>
                        <li>Use MP3 for audiobooks and podcasts</li>
                        <li>Keep file sizes under 100MB when possible</li>
                        <li>Use descriptive filenames for better organization</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5 text-green-500" />
                      Conversion Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Free conversion tools:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Calibre</strong> - Best for ebook conversion</li>
                        <li><strong>Audacity</strong> - Audio format conversion</li>
                        <li><strong>LibreOffice</strong> - Document to PDF</li>
                        <li><strong>Online converters</strong> - Quick conversions</li>
                        <li><strong>VLC Media Player</strong> - Audio/video conversion</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-500" />
                      Coming Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Future format support:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>MOBI ebook format</li>
                        <li>AZW Kindle format</li>
                        <li>FLAC audio format</li>
                        <li>Built-in format conversion</li>
                        <li>Advanced metadata extraction</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-orange-500" />
                      Need Help?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        If you&apos;re having trouble with file formats:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Check the file isn&apos;t corrupted</li>
                        <li>Try converting to a supported format</li>
                        <li>Ensure the file isn&apos;t DRM-protected</li>
                        <li>Reduce file size if it&apos;s too large</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel Upload
          </Button>
          {valid.length > 0 && (
            <Button onClick={handleProceedWithValid}>
              Upload {valid.length} Valid Files
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Validation preview component for use in upload areas
export function FileValidationPreview({ files }: { files: File[] }) {
  const validation = validateFiles(files);
  const { valid, invalid } = validation;

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      {valid.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>{valid.length} valid files</span>
        </div>
      )}
      
      {invalid.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span>{invalid.length} invalid files</span>
        </div>
      )}
    </div>
  );
}