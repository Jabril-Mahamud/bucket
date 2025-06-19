"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Upload, 
  X, 
  Loader2, 
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Calendar,
  User,
  Tag,
  Globe,
  Hash,
  FileText
} from "lucide-react";
import { BookMetadata, validateMetadata, parseMetadataFromFilename } from "@/lib/metadata-utils";

interface LibraryFile {
  id: string;
  filename: string;
  title?: string;
  author?: string;
  series?: string;
  genre?: string;
  publication_date?: string;
  language?: string;
  description?: string;
  cover_art_path?: string;
  isbn?: string;
  series_number?: number;
}

interface EditMetadataDialogProps {
  file: LibraryFile;
  onSave: () => void;
  trigger?: React.ReactNode;
}

const COMMON_GENRES = [
  'Fiction',
  'Non-fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Romance',
  'Horror',
  'Biography',
  'History',
  'Business',
  'Self-help',
  'Technology',
  'Cookbook',
  'Travel',
  'Poetry',
  'Drama',
  'Philosophy',
  'Religion',
  'Health',
  'Art',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export function EditMetadataDialog({ file, onSave, trigger }: EditMetadataDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [metadata, setMetadata] = useState<BookMetadata>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      // Initialize metadata from file
      setMetadata({
        title: file.title || '',
        author: file.author || '',
        series: file.series || '',
        genre: file.genre || '',
        publication_date: file.publication_date || '',
        language: file.language || 'en',
        description: file.description || '',
        isbn: file.isbn || '',
        series_number: file.series_number || undefined,
      });
      
      // Set cover preview if exists
      if (file.cover_art_path) {
        const { data } = supabase.storage
          .from('cover-art')
          .getPublicUrl(file.cover_art_path);
        setCoverPreview(data.publicUrl);
      } else {
        setCoverPreview(null);
      }
    }
  }, [open, file, supabase]);

  const handleInputChange = (field: keyof BookMetadata, value: string | number | undefined) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const autoDetectMetadata = () => {
    const detected = parseMetadataFromFilename(file.filename);
    setMetadata(prev => ({
      ...prev,
      ...detected,
      // Don't override if already has values
      title: prev.title || detected.title || '',
      author: prev.author || detected.author || '',
      series: prev.series || detected.series || '',
      genre: prev.genre || detected.genre || '',
      publication_date: prev.publication_date || detected.publication_date || '',
      language: prev.language || detected.language || 'en',
      description: prev.description || detected.description || '',
      isbn: prev.isbn || detected.isbn || '',
      series_number: prev.series_number || detected.series_number || undefined,
    }));
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFile = event.target.files?.[0];
    if (!uploadFile) return;

    // Validate file type
    if (!uploadFile.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (uploadFile.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setCoverUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create file path
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${user.id}/${file.id}-cover.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cover-art')
        .upload(filePath, uploadFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Update metadata
      setMetadata(prev => ({
        ...prev,
        cover_art_path: filePath
      }));

      // Set preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(uploadFile);

    } catch (error) {
      console.error('Error uploading cover:', error);
      alert('Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    if (metadata.cover_art_path) {
      try {
        await supabase.storage
          .from('cover-art')
          .remove([metadata.cover_art_path]);
      } catch (error) {
        console.error('Error removing cover:', error);
      }
    }
    
    setMetadata(prev => ({
      ...prev,
      cover_art_path: undefined
    }));
    setCoverPreview(null);
  };

  const handleSave = async () => {
    // Validate metadata
    const validationErrors = validateMetadata(metadata);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('files')
        .update({
          title: metadata.title || null,
          author: metadata.author || null,
          series: metadata.series || null,
          genre: metadata.genre || null,
          publication_date: metadata.publication_date || null,
          language: metadata.language || 'en',
          description: metadata.description || null,
          cover_art_path: metadata.cover_art_path || null,
          isbn: metadata.isbn || null,
          series_number: metadata.series_number || null,
        })
        .eq('id', file.id);

      if (error) throw error;

      onSave();
      setOpen(false);
    } catch (error) {
      console.error('Error saving metadata:', error);
      setErrors(['Failed to save metadata']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="h-3 w-3" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Edit Metadata
          </DialogTitle>
          <DialogDescription>
            Update book information and cover art for {file.filename}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cover Art Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cover Art</Label>
              <div className="aspect-[3/4] border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden bg-muted/30 relative group">
                {coverPreview ? (
                  <>
                    <img 
                      src={coverPreview} 
                      alt="Cover" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removeCover}
                        className="gap-2"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No cover image
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={coverUploading}
                      className="gap-2"
                    >
                      {coverUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Upload
                    </Button>
                  </div>
                )}
              </div>
              
              {coverPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={coverUploading}
                  className="w-full gap-2"
                >
                  {coverUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Change Cover
                </Button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Metadata Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auto-detect button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={autoDetectMetadata}
                className="gap-2"
              >
                <Sparkles className="h-3 w-3" />
                Auto-detect from filename
              </Button>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3" />
                  Title
                </Label>
                <Input
                  id="title"
                  value={metadata.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter book title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author" className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Author
                </Label>
                <Input
                  id="author"
                  value={metadata.author || ''}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Enter author name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="series" className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Series
                </Label>
                <Input
                  id="series"
                  value={metadata.series || ''}
                  onChange={(e) => handleInputChange('series', e.target.value)}
                  placeholder="Enter series name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="series_number" className="flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Series Number
                </Label>
                <Input
                  id="series_number"
                  type="number"
                  min="1"
                  max="9999"
                  value={metadata.series_number || ''}
                  onChange={(e) => handleInputChange('series_number', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Book number in series"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre" className="flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Genre
                </Label>
                <Select value={metadata.genre || ''} onValueChange={(value) => handleInputChange('genre', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publication_date" className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Publication Date
                </Label>
                <Input
                  id="publication_date"
                  type="date"
                  value={metadata.publication_date || ''}
                  onChange={(e) => handleInputChange('publication_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  Language
                </Label>
                <Select value={metadata.language || 'en'} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn" className="flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  ISBN
                </Label>
                <Input
                  id="isbn"
                  value={metadata.isbn || ''}
                  onChange={(e) => handleInputChange('isbn', e.target.value)}
                  placeholder="Enter ISBN number"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Description
              </Label>
              <Textarea
                id="description"
                value={metadata.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter book description or summary"
                rows={4}
              />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {error}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}