import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUsage } from "@/hooks/useSubscription";
import { Progress } from "@radix-ui/react-progress";
import { AlertTriangle, Upload, Volume2, HardDrive, Zap, Link, ArrowRight } from "lucide-react";

export function UsageDashboard() {
  const { usage, loading, error, refreshUsage } = useUsage();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-2 bg-muted rounded mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load usage data. 
          <Button variant="link" onClick={refreshUsage} className="p-0 h-auto ml-1">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!usage) return null;

  const usageItems = [
    {
      type: 'uploads' as const,
      icon: <Upload className="h-4 w-4" />,
      label: 'File Uploads',
      current: usage.current.uploads,
      limit: usage.limits.uploads,
      unit: 'files'
    },
    {
      type: 'tts' as const,
      icon: <Volume2 className="h-4 w-4" />,
      label: 'TTS Characters',
      current: usage.current.ttsCharacters,
      limit: usage.limits.ttsCharacters,
      unit: 'chars'
    },
    {
      type: 'storage' as const,
      icon: <HardDrive className="h-4 w-4" />,
      label: 'Storage',
      current: usage.current.storageGB,
      limit: usage.limits.storageGB,
      unit: 'GB'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Usage</h3>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          {usage.planName}
        </Badge>
      </div>

      <div className="grid gap-4">
        {usageItems.map((item) => {
          const percentage = item.limit === -1 ? 0 : Math.min((item.current / item.limit) * 100, 100);
          const isUnlimited = item.limit === -1;
          
          return (
            <div key={item.type} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className="text-muted-foreground">
                  {item.type === 'tts' && item.current > 1000 
                    ? `${(item.current / 1000).toFixed(0)}k`
                    : item.current.toLocaleString()
                  }
                  {!isUnlimited && (
                    <>
                      {' / '}
                      {item.type === 'tts' && item.limit > 1000 
                        ? `${(item.limit / 1000).toFixed(0)}k`
                        : item.limit.toLocaleString()
                      }
                    </>
                  )}
                  {' '}{item.unit}
                </span>
              </div>
              
              {!isUnlimited && (
                <Progress 
                  value={percentage} 
                  className={percentage >= 90 ? 'bg-destructive/20' : ''}
                />
              )}
              
              {isUnlimited && (
                <div className="text-xs text-muted-foreground">
                  Unlimited usage
                </div>
              )}
            </div>
          );
        })}
      </div>

      {usage.planName === 'free' && (
        <div className="pt-4 border-t">
          <Button asChild className="w-full gap-2">
            <Link href="/pricing">
              <Zap className="h-4 w-4" />
              Upgrade for More Usage
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
