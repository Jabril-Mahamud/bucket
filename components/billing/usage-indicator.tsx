// components/billing/usage-indicator.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  Volume2, 
  HardDrive, 
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Infinity,
  Sparkles,
  Crown
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UsageData {
  current: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  limits: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  planName: string;
  subscriptionStatus: string;
}

interface UsageIndicatorProps {
  compact?: boolean;
  className?: string;
}

export function UsageIndicator({ compact = false, className = "" }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          setUsage(data.usage);
        }
      } catch (error) {
        console.error('Error fetching usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading || !usage) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 animate-pulse">
          <div className="h-4 w-16 bg-muted rounded"></div>
          <div className="h-4 w-20 bg-muted rounded"></div>
        </div>
      );
    }
    return null;
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageStatus = (current: number, limit: number) => {
    if (limit === -1) return 'unlimited';
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'personal':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'professional':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'enterprise':
        return <Crown className="h-4 w-4 text-amber-500" />;
      default:
        return <Zap className="h-4 w-4 text-primary" />;
    }
  };

  const getPlanGradient = (plan: string) => {
    switch (plan) {
      case 'personal':
        return 'from-blue-500/20 to-blue-600/20 border-blue-200/50 dark:border-blue-800/50';
      case 'professional':
        return 'from-purple-500/20 to-purple-600/20 border-purple-200/50 dark:border-purple-800/50';
      case 'enterprise':
        return 'from-amber-500/20 to-amber-600/20 border-amber-200/50 dark:border-amber-800/50';
      default:
        return 'from-slate-500/20 to-slate-600/20 border-slate-200/50 dark:border-slate-800/50';
    }
  };

  const usageItems = [
    {
      label: 'Uploads',
      icon: Upload,
      current: usage.current.uploads,
      limit: usage.limits.uploads,
      unit: '',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'TTS',
      icon: Volume2,
      current: usage.current.ttsCharacters,
      limit: usage.limits.ttsCharacters,
      unit: ' chars',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      label: 'Storage',
      icon: HardDrive,
      current: Number(usage.current.storageGB.toFixed(1)),
      limit: usage.limits.storageGB,
      unit: 'GB',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    }
  ];

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Plan Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium border transition-all duration-200",
              getPlanGradient(usage.planName)
            )}
          >
            <div className="flex items-center gap-1">
              {getPlanIcon(usage.planName)}
              {formatPlanName(usage.planName)}
            </div>
          </Badge>
          {usage.planName === 'free' && (
            <Button asChild size="sm" variant="ghost" className="h-6 px-2 text-xs">
              <Link href="/pricing">
                Upgrade
                <TrendingUp className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {/* Compact Usage Items */}
        <div className="space-y-2">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.current, item.limit);
            const status = getUsageStatus(item.current, item.limit);
            
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("p-1 rounded-sm", item.bgColor)}>
                      <item.icon className={cn("h-2.5 w-2.5", item.color)} />
                    </div>
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-mono text-xs",
                      status === 'critical' ? 'text-red-600 dark:text-red-400' : 
                      status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
                      'text-muted-foreground'
                    )}>
                      {formatNumber(item.current)}{item.unit}
                    </span>
                    <span className="text-muted-foreground text-xs">/</span>
                    <span className="text-muted-foreground text-xs">
                      {item.limit === -1 ? (
                        <Infinity className="h-3 w-3" />
                      ) : (
                        `${formatNumber(item.limit)}${item.unit}`
                      )}
                    </span>
                  </div>
                </div>
                
                {item.limit !== -1 && (
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-1.5 transition-all duration-300",
                      status === 'critical' ? '[&>div]:bg-red-500' : 
                      status === 'warning' ? '[&>div]:bg-amber-500' : 
                      '[&>div]:bg-primary'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-2 shadow-sm", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon(usage.planName)}
            <span className="text-lg">Usage Overview</span>
          </div>
          <Badge 
            variant={usage.subscriptionStatus === 'active' ? 'default' : 'secondary'}
            className={cn(
              "font-medium transition-all duration-200",
              usage.subscriptionStatus === 'active' && getPlanGradient(usage.planName)
            )}
          >
            {formatPlanName(usage.planName)} Plan
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.current, item.limit);
            const status = getUsageStatus(item.current, item.limit);
            
            return (
              <div key={item.label} className="space-y-3 p-4 rounded-lg border bg-gradient-to-r from-accent/20 to-accent/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", item.bgColor)}>
                      <item.icon className={cn("h-4 w-4", item.color)} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        {status === 'critical' && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        {status === 'unlimited' && (
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                        )}
                        <span className={cn(
                          "text-xs",
                          status === 'critical' ? 'text-red-600 dark:text-red-400' : 
                          status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
                          'text-muted-foreground'
                        )}>
                          {status === 'critical' ? 'Critical' : status === 'warning' ? 'Warning' : status === 'unlimited' ? 'Unlimited' : 'Good'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {formatNumber(item.current)}{item.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {item.limit === -1 ? 'unlimited' : `${formatNumber(item.limit)}${item.unit}`}
                    </div>
                  </div>
                </div>
                
                {item.limit !== -1 && (
                  <div className="space-y-2">
                    <Progress 
                      value={percentage} 
                      className={cn(
                        "h-2 transition-all duration-500",
                        status === 'critical' ? '[&>div]:bg-red-500' : 
                        status === 'warning' ? '[&>div]:bg-amber-500' : 
                        '[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80'
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% used</span>
                      <span>{formatNumber(item.limit - item.current)}{item.unit} remaining</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upgrade Prompt */}
        {(usage.current.uploads / usage.limits.uploads > 0.7 || 
          usage.current.ttsCharacters / usage.limits.ttsCharacters > 0.7 || 
          usage.current.storageGB / usage.limits.storageGB > 0.7) && 
          usage.planName === 'free' && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-amber-900 dark:text-amber-100">
                  Approaching usage limits
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Consider upgrading your plan for higher limits and additional features.
                </p>
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Link href="/pricing" className="gap-2">
                    <Sparkles className="h-3 w-3" />
                    Upgrade Plan
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}