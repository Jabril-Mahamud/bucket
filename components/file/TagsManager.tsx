"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Tag as TagIcon, 
  Plus, 
  X, 
  Check,
  
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsManagerProps {
  fileId: string;
  fileTags: Tag[];
  onTagsChange: () => void;
  trigger?: React.ReactNode;
  showBadges?: boolean;
  maxBadges?: number;
  className?: string;
}

export function TagsManager({
  fileId,
  fileTags,
  onTagsChange,
  trigger,
  showBadges = true,
  maxBadges = 3,
  className
}: TagsManagerProps) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      fetchAllTags();
    }
  }, [open]);

  const fetchAllTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tagsData, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAllTags(tagsData || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const createAndAssignTag = async (tagName: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create new tag
      const { data: newTag, error: tagError } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: tagName.trim(),
          color: '#6366f1' // Default color
        })
        .select()
        .single();

      if (tagError) throw tagError;

      // Assign tag to file
      await assignTag(newTag.id);
      
      // Refresh tags list
      fetchAllTags();
      setSearchQuery("");
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignTag = async (tagId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('file_tags')
        .insert({
          user_id: user.id,
          file_id: fileId,
          tag_id: tagId
        });

      if (error) throw error;
      onTagsChange();
    } catch (error) {
      console.error('Error assigning tag:', error);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('file_tags')
        .delete()
        .eq('file_id', fileId)
        .eq('tag_id', tagId);

      if (error) throw error;
      onTagsChange();
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const isTagAssigned = (tagId: string) => {
    return fileTags.some(tag => tag.id === tagId);
  };

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shouldShowCreateOption = searchQuery.trim() && 
    !filteredTags.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());

  // Display badges for current tags
  const displayTags = showBadges ? fileTags.slice(0, maxBadges) : [];
  const hiddenCount = fileTags.length - maxBadges;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* Current Tags as Badges */}
      {displayTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="gap-1 pr-1 text-xs"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
          <Button
            variant="ghost"
            size="sm"
            className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag.id);
            }}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}

      {/* Show count of hidden tags */}
      {showBadges && hiddenCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{hiddenCount}
        </Badge>
      )}

      {/* Tag Manager Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-1 h-7">
              <TagIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Tags</span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create tags..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery ? "No tags found." : "No tags available."}
              </CommandEmpty>
              
              {/* Create new tag option */}
              {shouldShowCreateOption && (
                <CommandGroup heading="Create">
                  <CommandItem
                    onSelect={() => createAndAssignTag(searchQuery)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Create {searchQuery}
                  </CommandItem>
                </CommandGroup>
              )}
              
              {/* Existing tags */}
              {filteredTags.length > 0 && (
                <CommandGroup heading="Available Tags">
                  {filteredTags.map((tag) => {
                    const isAssigned = isTagAssigned(tag.id);
                    
                    return (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          if (isAssigned) {
                            removeTag(tag.id);
                          } else {
                            assignTag(tag.id);
                          }
                        }}
                        className="gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </div>
                        {isAssigned && <Check className="h-3 w-3" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}