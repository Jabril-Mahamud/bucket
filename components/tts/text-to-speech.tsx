// components/tts/enhanced-text-to-speech.tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertTriangle,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { toast } from "sonner";
import Link from "next/link";
import { useUsage } from "@/lib/stripe/contexts/usage-context";
import { UsageWarning } from "../billing/pricing/usage/usage-warning";
import { UsageGate } from "../billing/pricing/usage/usage-gate";

interface EnhancedTextToSpeechProps {
  initialText?: string;
  fileId?: string;
  className?: string;
}

export function EnhancedTextToSpeech({
  initialText = "",
  fileId,
  className,
}: EnhancedTextToSpeechProps) {
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
    fetchUsage: true,
    fetchVoices: true,
  });

  const { 
    usage, 
    checkCanUseTTS, 
    refreshUsage, 
    getUsagePercentage, 
    isNearLimit,
    formatRemainingUsage 
  } = useUsage();

  const handleConvert = useCallback(
    async (textToConvert?: string) => {
      const targetText = textToConvert || selectedText || text;

      if (!targetText.trim()) {
        toast.error("Please enter or select some text to convert");
        return;
      }

      // Pre-flight usage check
      const usageCheck = checkCanUseTTS(targetText.length);
      if (!usageCheck.allowed) {
        toast.error("TTS limit exceeded", {
          description: usageCheck.reason,
          action: usage?.planName === 'free' ? {
            label: "Upgrade Plan",
            onClick: () => window.open('/pricing', '_blank')
          } : undefined
        });
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

        // Refresh usage data after successful conversion
        await refreshUsage();

        // Clear selected text after conversion
        setSelectedText("");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Conversion failed";
        
        // Check if it's a usage limit error
        if (errorMessage.includes('limit') || errorMessage.includes('exceeded')) {
          toast.error("TTS limit exceeded", {
            description: errorMessage,
            action: usage?.planName === 'free' ? {
              label: "Upgrade Plan",
              onClick: () => window.open('/pricing', '_blank')
            } : undefined
          });
        } else {
          toast.error("Conversion failed", {
            description: errorMessage
          });
        }
      }
    },
    [text, selectedText, selectedVoice, fileId, convertToSpeech, checkCanUseTTS, usage, refreshUsage]
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

  const getTTSUsageProgress = () => {
    if (!currentUsage) return 0;
    const limit = 100000; // 100k characters monthly limit for display
    return Math.min((currentUsage.total_characters / limit) * 100, 100);
  };

  const getRemainingCharacters = () => {
    if (!usage) return 0;
    return Math.max(0, usage.limits.ttsCharacters - usage.current.ttsCharacters);
  };

  const canConvert = () => {
    const targetText = selectedText || text;
    return targetText.trim().length > 0 && targetText.length <= 3000;
  };

  const showTTSWarning = isNearLimit('tts', 70);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Text to Speech
          {usage && (
            <Badge variant="outline" className="ml-auto">
              {formatRemainingUsage('tts')} remaining
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Warning */}
        {showTTSWarning && <UsageWarning type="tts" />}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </AlertDescription>
          </Alert>
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
              &quot;{selectedText}&quot;
            </p>
          </div>
        )}

        {/* Usage Gate for TTS */}
        <UsageGate 
          type="tts" 
          requiredAmount={selectedText ? selectedText.length : text.length}
          fallback={
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You&apos;ve reached your monthly TTS character limit.
                {usage?.planName === 'free' && (
                  <Button asChild variant="link" className="p-0 h-auto ml-1">
                    <Link href="/pricing">Upgrade your plan</Link>
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          }
        >
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleConvert()}
              disabled={isLoading || !canConvert()}
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
        </UsageGate>

        {/* Usage Statistics */}
        {(currentUsage || usage) && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Monthly TTS Usage</span>
            </div>

            {usage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Characters</span>
                  <span className="font-medium">
                    {usage.current.ttsCharacters.toLocaleString()} / {
                      usage.limits.ttsCharacters === -1 
                        ? '∞' 
                        : usage.limits.ttsCharacters.toLocaleString()
                    }
                  </span>
                </div>
                {usage.limits.ttsCharacters !== -1 && (
                  <Progress value={getUsagePercentage('tts')} className="h-2" />
                )}
              </div>
            )}

            {currentUsage && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Total Cost</span>
                </div>
                <span className="font-medium">
                  ${formatCost(currentUsage.total_cost_cents)}
                </span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Usage resets monthly. Standard rate: $0.004 per 1,000 characters.
            </p>

            {/* Upgrade prompt for free users approaching limit */}
            {usage?.planName === 'free' && getUsagePercentage('tts') > 70 && (
              <div className="pt-2 border-t">
                <Button asChild size="sm" className="w-full gap-2">
                  <Link href="/pricing">
                    <Zap className="h-4 w-4" />
                    Upgrade for More TTS Characters
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}