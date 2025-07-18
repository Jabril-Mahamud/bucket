// components/tts/usage-dashboard.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Volume2,
  Clock
} from "lucide-react";

interface TTSUsageData {
  total_characters: number;
  current_month: string;
}

interface RecentUsage {
  id: string;
  text_snippet: string;
  character_count: number;
  voice_id: string;
  created_at: string | null;
}

export function TTSUsageDashboard() {
  const [currentUsage, setCurrentUsage] = useState<TTSUsageData | null>(null);
  const [recentUsage, setRecentUsage] = useState<RecentUsage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const MONTHLY_LIMIT = 100000; // 100k characters

  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current month usage (without cost information)
      const { data: usageData } = await supabase.rpc('get_current_month_tts_usage', {
        target_user_id: user.id
      });

      if (usageData && usageData.length > 0) {
        setCurrentUsage({
          total_characters: usageData[0].total_characters,
          current_month: usageData[0].current_month
        });
      }

      // Fetch recent usage (without cost information)
      const { data: recentData } = await supabase
        .from('tts_usage')
        .select('id, text_snippet, character_count, voice_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentData) {
        setRecentUsage(recentData);
      }

    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsageProgress = () => {
    if (!currentUsage) return 0;
    return Math.min((currentUsage.total_characters / MONTHLY_LIMIT) * 100, 100);
  };

  const getRemainingCharacters = () => {
    if (!currentUsage) return MONTHLY_LIMIT;
    return Math.max(MONTHLY_LIMIT - currentUsage.total_characters, 0);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards - Removed Cost Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Month Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Characters Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUsage?.total_characters.toLocaleString() || 0}
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used</span>
                <span>{MONTHLY_LIMIT.toLocaleString()} limit</span>
              </div>
              <Progress value={getUsageProgress()} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {getRemainingCharacters().toLocaleString()} characters remaining
            </p>
          </CardContent>
        </Card>

        {/* Current Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billing Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUsage?.current_month || new Date().toISOString().slice(0, 7)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Resets on the 1st of each month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent TTS Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No TTS usage yet</p>
              <p className="text-xs">Start converting text to speech to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsage.map((usage) => (
                <div
                  key={usage.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      &quot;{usage.text_snippet}...&quot;
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{usage.character_count} chars</span>
                      <span>{usage.voice_id}</span>
                      <span>{formatDate(usage.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      Audio Created
                    </Badge>
                  </div>
                </div>
              ))}
              
              {recentUsage.length === 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing last 10 conversions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• Select specific text portions instead of entire documents to save characters</p>
            <p>• Use punctuation and shorter sentences for better speech quality</p>
            <p>• Different voices may sound better for different types of content</p>
            <p>• Your monthly allowance resets on the 1st of each month</p>
            <p>• Audio files are automatically saved to your library for offline listening</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}