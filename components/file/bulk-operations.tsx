// components/file/bulk-operations.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  Square,
  Trash2,
  Tag,
  Star,
  Download,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryFile {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  title?: string;
  author?: string;
  genre?: string;
  is_favorite?: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface BulkOperationsProps {
  selectedFiles: Set<string>;
  allFiles: LibraryFile[];
  onSelectionChange: (selection: Set<string>) => void;
  onOperationComplete: () => void;
  availableTags: Tag[];
  className?: string;
}

export function BulkOperations({
  selectedFiles,
  allFiles,
  onSelectionChange,
  onOperationComplete,
  availableTags,
  className,
}: BulkOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<Set<string>>(
    new Set()
  );
  const [bulkGenre, setBulkGenre] = useState<string>("");

  const supabase = createClient();

  const selectedCount = selectedFiles.size;
  const totalCount = allFiles.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalCount;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allFiles.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const filesToDelete = Array.from(selectedFiles);

      for (const fileId of filesToDelete) {
        const file = allFiles.find((f) => f.id === fileId);
        if (file) {
          // Delete from storage
          await supabase.storage.from("user-files").remove([file.file_path]);

          // Delete from database (cascades to progress, tags, etc.)
          await supabase.from("files").delete().eq("id", fileId);
        }
      }

      onSelectionChange(new Set());
      onOperationComplete();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkToggleFavorite = async (makeFavorite: boolean) => {
    setLoading(true);
    try {
      const filesToUpdate = Array.from(selectedFiles);

      const { error } = await supabase
        .from("files")
        .update({
          is_favorite: makeFavorite,
          last_accessed_at: new Date().toISOString(),
        })
        .in("id", filesToUpdate);

      if (error) throw error;

      onOperationComplete();
    } catch (error) {
      console.error("Error updating favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddTags = async () => {
    if (selectedTagsForBulk.size === 0) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const filesToTag = Array.from(selectedFiles);
      const tagsToAdd = Array.from(selectedTagsForBulk);

      // Create file_tags entries
      const fileTagInserts = [];
      for (const fileId of filesToTag) {
        for (const tagId of tagsToAdd) {
          fileTagInserts.push({
            user_id: user.id,
            file_id: fileId,
            tag_id: tagId,
          });
        }
      }

      const { error } = await supabase
        .from("file_tags")
        .upsert(fileTagInserts, {
          onConflict: "file_id,tag_id",
          ignoreDuplicates: true,
        });

      if (error) throw error;

      setSelectedTagsForBulk(new Set());
      setTagDialogOpen(false);
      onOperationComplete();
    } catch (error) {
      console.error("Error adding tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateGenre = async () => {
    if (!bulkGenre) return;

    setLoading(true);
    try {
      const filesToUpdate = Array.from(selectedFiles);

      const { error } = await supabase
        .from("files")
        .update({ genre: bulkGenre })
        .in("id", filesToUpdate);

      if (error) throw error;

      setBulkGenre("");
      onOperationComplete();
    } catch (error) {
      console.error("Error updating genre:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    setLoading(true);
    try {
      // For now, download files one by one
      // In a production app, you might want to create a zip file server-side
      for (const fileId of Array.from(selectedFiles)) {
        const file = allFiles.find((f) => f.id === fileId);
        if (file) {
          const { data, error } = await supabase.storage
            .from("user-files")
            .download(file.file_path);

          if (error) throw error;

          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Error downloading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedFileTypes = () => {
    const types = new Set<string>();
    selectedFiles.forEach((fileId) => {
      const file = allFiles.find((f) => f.id === fileId);
      if (file) {
        if (file.file_type.startsWith("audio/")) types.add("audio");
        else if (file.file_type === "application/pdf") types.add("pdf");
        else if (file.file_type === "application/epub+zip") types.add("epub");
        else types.add("other");
      }
    });
    return Array.from(types);
  };

  const getSelectedFileInfo = () => {
    const files = Array.from(selectedFiles)
      .map((id) => allFiles.find((f) => f.id === id))
      .filter(Boolean) as LibraryFile[];

    const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
    const favoriteCount = files.filter((f) => f.is_favorite).length;

    return { files, totalSize, favoriteCount };
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  if (selectedCount === 0) return null;

  const { totalSize, favoriteCount } = getSelectedFileInfo();
  const fileTypes = getSelectedFileTypes();

  return (
    <div
      className={cn("bg-primary/5 border-t border-primary/10 p-3", className)}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 w-8 p-0"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : isPartialSelected ? (
                <div className="h-4 w-4 border-2 border-current bg-current/20" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>

            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(totalSize)}</span>
            {favoriteCount > 0 && (
              <>
                <span>•</span>
                <span>{favoriteCount} favorites</span>
              </>
            )}
            {fileTypes.length > 0 && (
              <>
                <span>•</span>
                <div className="flex gap-1">
                  {fileTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkToggleFavorite(true)}
            disabled={loading}
            className="gap-1 flex-1 sm:flex-none"
          >
            <Star className="h-3 w-3" />
            <span className="hidden sm:inline">Favorite</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            disabled={loading}
            className="gap-1 flex-1 sm:flex-none"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Download</span>
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <span className="hidden sm:inline">More</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTagDialogOpen(true)}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => handleBulkToggleFavorite(false)}>
                <Star className="h-4 w-4 mr-2" />
                Remove from Favorites
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to Selected Files</DialogTitle>
            <DialogDescription>
              Add tags to {selectedCount} selected files. Select which tags to
              apply.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
              {availableTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    const newSelection = new Set(selectedTagsForBulk);
                    if (newSelection.has(tag.id)) {
                      newSelection.delete(tag.id);
                    } else {
                      newSelection.add(tag.id);
                    }
                    setSelectedTagsForBulk(newSelection);
                  }}
                >
                  <Checkbox
                    checked={selectedTagsForBulk.has(tag.id)}
                    onChange={() => {}} // Handled by onClick above
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
              ))}

              {availableTags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tags available. Create some tags first.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">
                Update Genre (Optional)
              </label>
              {bulkGenre && (
                <Button
                  onClick={handleBulkUpdateGenre}
                  disabled={loading}
                  className="w-full mt-2"
                >
                  Update Genre
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddTags}
              disabled={
                loading || (selectedTagsForBulk.size === 0 && !bulkGenre)
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Selected Files
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} selected files?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-destructive/80 space-y-1">
                  <li>• {selectedCount} files from your library</li>
                  <li>• All associated metadata and progress</li>
                  <li>• File tags and favorites status</li>
                  <li>• Files from cloud storage</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete {selectedCount} Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
