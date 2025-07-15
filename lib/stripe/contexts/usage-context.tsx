// lib/contexts/usage-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UsageData {
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
  planName: 'free' | 'personal' | 'professional' | 'enterprise';
  subscriptionStatus: string;
}

export interface UsageContextType {
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  checkCanUpload: (fileSize?: number) => { allowed: boolean; reason?: string };
  checkCanUseTTS: (characterCount?: number) => { allowed: boolean; reason?: string };
  getUsagePercentage: (type: 'uploads' | 'tts' | 'storage') => number;
  isNearLimit: (type: 'uploads' | 'tts' | 'storage', threshold?: number) => boolean;
  formatRemainingUsage: (type: 'uploads' | 'tts' | 'storage') => string;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}

interface UsageProviderProps {
  children: ReactNode;
}

export function UsageProvider({ children }: UsageProviderProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchUsage = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUsage(null);
        return;
      }

      const response = await fetch('/api/subscription/status');
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setUsage(data.usage);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshUsage = useCallback(async () => {
    setLoading(true);
    await fetchUsage();
  }, [fetchUsage]);

  // Check if user can upload a file
  const checkCanUpload = useCallback((fileSize: number = 0) => {
    if (!usage) return { allowed: false, reason: 'Usage data not available' };

    // Check upload limit
    if (usage.limits.uploads !== -1 && usage.current.uploads >= usage.limits.uploads) {
      return { 
        allowed: false, 
        reason: `Monthly upload limit of ${usage.limits.uploads} files reached` 
      };
    }

    // Check storage limit (convert fileSize from bytes to GB)
    const fileSizeGB = fileSize / (1024 * 1024 * 1024);
    const remainingStorage = usage.limits.storageGB - usage.current.storageGB;
    
    if (fileSizeGB > remainingStorage) {
      return { 
        allowed: false, 
        reason: `File size exceeds remaining storage (${remainingStorage.toFixed(2)}GB available)` 
      };
    }

    return { allowed: true };
  }, [usage]);

  // Check if user can use TTS
  const checkCanUseTTS = useCallback((characterCount: number = 0) => {
    if (!usage) return { allowed: false, reason: 'Usage data not available' };

    const remaining = usage.limits.ttsCharacters - usage.current.ttsCharacters;
    
    if (characterCount > remaining) {
      return { 
        allowed: false, 
        reason: `Text too long. ${remaining.toLocaleString()} characters remaining this month` 
      };
    }

    return { allowed: true };
  }, [usage]);

  // Get usage percentage for a specific type
  const getUsagePercentage = useCallback((type: 'uploads' | 'tts' | 'storage') => {
    if (!usage) return 0;

    let current: number;
    let limit: number;

    switch (type) {
      case 'uploads':
        current = usage.current.uploads;
        limit = usage.limits.uploads;
        break;
      case 'tts':
        current = usage.current.ttsCharacters;
        limit = usage.limits.ttsCharacters;
        break;
      case 'storage':
        current = usage.current.storageGB;
        limit = usage.limits.storageGB;
        break;
      default:
        return 0;
    }

    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  }, [usage]);

  // Check if usage is near limit
  const isNearLimit = useCallback((type: 'uploads' | 'tts' | 'storage', threshold: number = 80) => {
    return getUsagePercentage(type) >= threshold;
  }, [getUsagePercentage]);

  // Format remaining usage for display
  const formatRemainingUsage = useCallback((type: 'uploads' | 'tts' | 'storage') => {
    if (!usage) return 'Unknown';

    let current: number;
    let limit: number;
    let unit: string;

    switch (type) {
      case 'uploads':
        current = usage.current.uploads;
        limit = usage.limits.uploads;
        unit = 'files';
        break;
      case 'tts':
        current = usage.current.ttsCharacters;
        limit = usage.limits.ttsCharacters;
        unit = 'characters';
        break;
      case 'storage':
        current = usage.current.storageGB;
        limit = usage.limits.storageGB;
        unit = 'GB';
        break;
      default:
        return 'Unknown';
    }

    if (limit === -1) return 'Unlimited';

    const remaining = Math.max(0, limit - current);
    
    if (type === 'tts' && remaining > 1000) {
      return `${(remaining / 1000).toFixed(0)}k characters`;
    }
    
    if (type === 'storage') {
      return `${remaining.toFixed(2)} GB`;
    }

    return `${remaining} ${unit}`;
  }, [usage]);

  // Fetch usage on mount and when user changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUsage();
      } else if (event === 'SIGNED_OUT') {
        setUsage(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUsage]);

  const contextValue: UsageContextType = {
    usage,
    loading,
    error,
    refreshUsage,
    checkCanUpload,
    checkCanUseTTS,
    getUsagePercentage,
    isNearLimit,
    formatRemainingUsage,
  };

  return (
    <UsageContext.Provider value={contextValue}>
      {children}
    </UsageContext.Provider>
  );
}