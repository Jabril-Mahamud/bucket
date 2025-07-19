// components/usage/usage-warning.tsx
"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Zap, 
  ArrowRight, 
  Upload, 
  Volume2, 
  HardDrive 
} from "lucide-react";
import Link from "next/link";
import { useUsage } from "@/lib/stripe/contexts/usage-context";

interface UsageWarningProps {
  type: 'files' | 'tts' | 'storage';
  className?: string;
}

export function UsageWarning({ type, className }: UsageWarningProps) {
  const { usage, getUsagePercentage, formatRemainingUsage, isNearLimit } = useUsage();

  if (!usage) return null;

  const percentage = getUsagePercentage(type);
  const remaining = formatRemainingUsage(type);
  const nearLimit = isNearLimit(type, 80);
  const atLimit = percentage >= 100;

  // Don't show warning if usage is low
  if (percentage < 70) return null;

  const getIcon = () => {
    switch (type) {
      case 'files': return <Upload className="h-4 w-4" />;
      case 'tts': return <Volume2 className="h-4 w-4" />;
      case 'storage': return <HardDrive className="h-4 w-4" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'files': return 'Upload Limit';
      case 'tts': return 'TTS Limit';
      case 'storage': return 'Storage Limit';
    }
  };

  const getDescription = () => {
    if (atLimit) {
      return `You've reached your monthly ${type} limit. Upgrade to continue.`;
    }
    if (nearLimit) {
      return `You're approaching your monthly ${type} limit. ${remaining} remaining.`;
    }
    return `${remaining} remaining this month.`;
  };

  return (
    <Alert className={className} variant={atLimit ? "destructive" : "default"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="font-medium">{getTitle()}</span>
            <Badge variant={atLimit ? "destructive" : nearLimit ? "secondary" : "outline"}>
              {usage.planName}
            </Badge>
          </div>
          <span className="text-sm font-medium">
            {percentage.toFixed(0)}%
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className={`mb-2 ${atLimit ? 'bg-destructive/20' : ''}`}
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {getDescription()}
          </span>
          
          {(atLimit || nearLimit) && usage.planName === 'free' && (
            <Button asChild size="sm" variant={atLimit ? "default" : "outline"}>
              <Link href="/pricing" className="gap-1">
                <Zap className="h-3 w-3" />
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}