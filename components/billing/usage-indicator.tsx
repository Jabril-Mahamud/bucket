// components/usage-indicator.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Volume2, 
  HardDrive, 
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from "lucide-react";

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
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const usageItems = [
    {
      label: 'Uploads',
      icon: Upload,
      current: usage.current.uploads,
      limit: usage.limits.uploads,
      unit: '',
      color: 'text-blue-600'
    },
    {
      label: 'TTS',
      icon: Volume2,
      current: usage.current.ttsCharacters,
      limit: usage.limits.ttsCharacters,
      unit: ' chars',
      color: 'text-purple-600'
    },
    {
      label: 'Storage',
      icon: HardDrive,
      current: Number(usage.current.storageGB.toFixed(1)),
      limit: usage.limits.storageGB,
      unit: 'GB',
      color: 'text-green-600'
    }
  ];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-xs">
          {formatPlanName(usage.planName)}
        </Badge>
        {usageItems.map((item) => {
          const status = getUsageStatus(item.current, item.limit);
          return (
            <div key={item.label} className="flex items-center gap-1 text-xs">
              <item.icon className={`h-3 w-3 ${item.color}`} />
              <span className={status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : 'text-muted-foreground'}>
                {formatNumber(item.current)}/{item.limit === -1 ? '∞' : formatNumber(item.limit)}{item.unit}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Usage Overview</span>
            </div>
            <Badge variant={usage.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
              {formatPlanName(usage.planName)} Plan
            </Badge>
          </div>

          <div className="space-y-4">
            {usageItems.map((item) => {
              const percentage = getUsagePercentage(item.current, item.limit);
              const status = getUsageStatus(item.current, item.limit);
              
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      <span className="font-medium">{item.label}</span>
                      {status === 'critical' && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      {status === 'unlimited' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <span className={`font-mono text-xs ${
                      status === 'critical' ? 'text-red-600' : 
                      status === 'warning' ? 'text-yellow-600' : 
                      'text-muted-foreground'
                    }`}>
                      {item.current}{item.unit} / {item.limit === -1 ? 'Unlimited' : `${item.limit}${item.unit}`}
                    </span>
                  </div>
                  
                  {item.limit !== -1 && (
                    <div className="space-y-1">
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${
                          status === 'critical' ? '[&>div]:bg-red-500' : 
                          status === 'warning' ? '[&>div]:bg-yellow-500' : ''
                        }`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{percentage.toFixed(1)}% used</span>
                        <span>{item.limit - item.current} remaining</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {(usage.current.uploads / usage.limits.uploads > 0.8 || 
            usage.current.ttsCharacters / usage.limits.ttsCharacters > 0.8 || 
            usage.current.storageGB / usage.limits.storageGB > 0.8) && 
            usage.planName === 'free' && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Approaching usage limits
                  </p>
                  <p className="text-yellow-600 dark:text-yellow-300 mt-1">
                    Consider upgrading your plan for higher limits and additional features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}