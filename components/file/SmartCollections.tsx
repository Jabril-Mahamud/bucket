"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Star, 
  Play, 
  CheckCircle, 
  BookOpen,
  Filter,
  Plus,
  X,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartCollectionsProps {
  selectedCollection: string | null;
  onCollectionSelect: (collection: string | null) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  fileStats: {
    recent: number;
    inProgress: number;
    completed: number;
    favorites: number;
    total: number;
  };
  className?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  file_count: number;
}

const SMART_COLLECTIONS = [
  {
    id: 'recent',
    name: 'Recent',
    icon: Clock,
    description: 'Recently added or accessed',
    color: 'text-blue-500'
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    icon: Play,
    description: 'Currently reading or listening',
    color: 'text-orange-500'
  },
  {
    id: 'completed',
    name: 'Completed',
    icon: CheckCircle,
    description: 'Finished reading or listening',
    color: 'text-green-500'
  },
  {
    id: 'favorites',
    name: 'Favorites',
    icon: Star,
    description: 'Your starred files',
    color: 'text-yellow-500'
  },
] as const;

export function SmartCollections({
  selectedCollection,
  onCollectionSelect,
  selectedTags,
  onTagsChange,
  fileStats,
  className
}: SmartCollectionsProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tagsData, error } = await supabase
        .from('tags')
        .select(`
          *,
          file_tags(count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const tagsWithCounts = tagsData.map(tag => ({
        ...tag,
        file_count: tag.file_tags?.length || 0
      }));

      setTags(tagsWithCounts);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: newTagName.trim(),
          color: newTagColor
        });

      if (error) throw error;

      setNewTagName("");
      setNewTagColor("#6366f1");
      setShowCreateTag(false);
      fetchTags();
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      fetchTags();
      
      // Remove from selected tags if it was selected
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const getCollectionCount = (collectionId: string) => {
    switch (collectionId) {
      case 'recent': return fileStats.recent;
      case 'in-progress': return fileStats.inProgress;
      case 'completed': return fileStats.completed;
      case 'favorites': return fileStats.favorites;
      default: return 0;
    }
  };

  const TAG_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", 
    "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1"
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Smart Collections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Smart Collections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* All Files */}
          <Button
            variant={selectedCollection === null ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-between h-9"
            onClick={() => onCollectionSelect(null)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>All Files</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {fileStats.total}
            </Badge>
          </Button>

          {/* Smart Collections */}
          {SMART_COLLECTIONS.map((collection) => {
            const Icon = collection.icon;
            const count = getCollectionCount(collection.id);
            const isSelected = selectedCollection === collection.id;
            
            return (
              <Button
                key={collection.id}
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-between h-9"
                onClick={() => onCollectionSelect(collection.id)}
                title={collection.description}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", collection.color)} />
                  <span>{collection.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Custom Tags */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Tags
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowCreateTag(!showCreateTag)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Create New Tag */}
          {showCreateTag && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <input
                type="text"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded bg-background"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />
              <div className="flex gap-1 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-5 h-5 rounded border-2 border-transparent",
                      newTagColor === color && "border-foreground"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createTag} disabled={loading || !newTagName.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateTag(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Tags */}
          <div className="space-y-1">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No tags yet. Create your first tag!
              </p>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors group",
                      isSelected 
                        ? "bg-secondary border-primary/20" 
                        : "hover:bg-muted/50 border-transparent"
                    )}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm truncate">{tag.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {tag.file_count}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTag(tag.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {(selectedCollection || selectedTags.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedCollection && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  {SMART_COLLECTIONS.find(c => c.id === selectedCollection)?.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => onCollectionSelect(null)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              </div>
            )}
            
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tagId) => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  
                  return (
                    <Badge key={tagId} variant="outline" className="gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => toggleTag(tagId)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                onCollectionSelect(null);
                onTagsChange([]);
              }}
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}