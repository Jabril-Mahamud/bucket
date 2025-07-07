// components/tts/text-to-speech.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Volume2,
  Play,
  Pause,
  Square,
  Loader2,
  DollarSign,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";

interface TextToSpeechProps {
  initialText?: string;
  fileId?: string;
  className?: string;
}

export function TextToSpeech({
  initialText = "",
  fileId,
  className,
}: TextToSpeechProps) {
  const [text, setText] = useState(initialText);
  const [selectedText, setSelectedText] = useState("");

  const {
    isLoading,
    isPlaying,
    voices,
    selectedVoice,
    error,
    currentUsage,
    convertToSpeech,
    togglePlayback,
    stopPlayback,
    setSelectedVoice,
    clearError,
  } = useTTS({
    fetchUsage: true, // Enable usage tracking for TTS component
    fetchVoices: true, // Enable voice fetching for TTS component
  });

  const handleConvert = useCallback(
    async (textToConvert?: string) => {
      const targetText = textToConvert || selectedText || text;

      if (!targetText.trim()) {
        toast.error("Please enter or select some text to convert");
        return;
      }

      if (targetText.length > 3000) {
        toast.error("Text is too long. Maximum 3000 characters allowed.");
        return;
      }

      try {
        const result = await convertToSpeech(targetText, {
          voiceId: selectedVoice,
          fileId,
          autoPlay: true,
        });

        toast.success(
          `Converted ${result.characterCount} characters (${(
            result.costCents / 100
          ).toFixed(4)}¢)`
        );

        // Clear selected text after conversion
        setSelectedText("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Conversion failed");
      }
    },
    [text, selectedText, selectedVoice, fileId, convertToSpeech]
  );

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  }, []);

  const formatCost = (cents: number) => {
    return (cents / 100).toFixed(4);
  };

  const getUsageProgress = () => {
    if (!currentUsage) return 0;
    const limit = 100000; // 100k characters monthly limit
    return Math.min((currentUsage.total_characters / limit) * 100, 100);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Text to Speech
          {currentUsage && (
            <Badge variant="outline" className="ml-auto">
              {currentUsage.total_characters.toLocaleString()} chars this month
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="flex-1 text-destructive">{error.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              ×
            </Button>
          </div>
        )}

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.description || `${voice.name} (${voice.languageCode})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tts-text">Text to Convert</Label>
            <span className="text-xs text-muted-foreground">
              {text.length}/3000 characters
            </span>
          </div>
          <Textarea
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onMouseUp={handleTextSelection}
            placeholder="Enter text to convert to speech, or select text from the document above..."
            rows={4}
            maxLength={3000}
            className="resize-none"
          />
        </div>

        {/* Selected Text Preview */}
        {selectedText && (
          <div className="p-3 bg-muted/50 border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Selected Text</Label>
              <Badge variant="secondary">{selectedText.length} chars</Badge>
            </div>
            <p className="text-sm text-muted-foreground italic line-clamp-3">
              *{selectedText}*
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleConvert()}
            disabled={isLoading || (!text.trim() && !selectedText.trim())}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Volume2 className="h-4 w-4 mr-2" />
            )}
            {selectedText ? "Convert Selected" : "Convert to Speech"}
          </Button>

          {isPlaying ? (
            <>
              <Button variant="outline" onClick={togglePlayback}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={stopPlayback}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={togglePlayback}
              disabled={!isPlaying && !document.querySelector("audio")}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Usage Statistics */}
        {currentUsage && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Monthly Usage</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Characters</span>
                <span className="font-medium">
                  {currentUsage.total_characters.toLocaleString()} / 100,000
                </span>
              </div>
              <Progress value={getUsageProgress()} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Total Cost</span>
              </div>
              <span className="font-medium">
                ${formatCost(currentUsage.total_cost_cents)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Usage resets monthly. Standard rate: $0.004 per 1,000 characters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
