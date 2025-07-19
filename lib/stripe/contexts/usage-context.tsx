// lib/stripe/contexts/usage-context.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { UsageData } from "../types";

export interface UsageContextType {
  usage: UsageData | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  checkCanUpload: (fileSize?: number) => { allowed: boolean; reason?: string };
  checkCanUseTTS: (characterCount?: number) => {
    allowed: boolean;
    reason?: string;
  };
  getUsagePercentage: (type: "files" | "tts" | "storage") => number;
  isNearLimit: (
    type: "files" | "tts" | "storage",
    threshold?: number
  ) => boolean;
  formatRemainingUsage: (type: "files" | "tts" | "storage") => string;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function useUsage() {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error("useUsage must be used within a UsageProvider");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUsage(null);
        setLoading(false);
        return;
      }

      // Add cache busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/subscription/status?t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch usage data`);
      }

      const data = await response.json();

      // Validate the response structure
      if (!data.usage) {
        throw new Error("Invalid response format: missing usage data");
      }

      setUsage(data.usage);
    } catch (err) {
      console.error("Error fetching usage:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch usage data"
      );

      // Set default usage for free plan if fetch fails
      setUsage({
        current: { totalFiles: 0, ttsCharacters: 0, storageGB: 0 },
        limits: { maxFiles: 5, ttsCharacters: 25000, storageGB: 1 },
        planName: "free",
        subscriptionStatus: "active",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshUsage = useCallback(async () => {
    setLoading(true);
    await fetchUsage();
  }, [fetchUsage]);

  // Check if user can upload a file
  const checkCanUpload = useCallback(
    (fileSize: number = 0) => {
      if (!usage) return { allowed: false, reason: "Usage data not available" };

      // Check upload limit
      // Change the file count check from monthly uploads to total files
      if (
        usage.limits.maxFiles !== -1 &&
        usage.current.totalFiles >= usage.limits.maxFiles
      ) {
        return {
          allowed: false,
          reason: `File limit of ${usage.limits.maxFiles} reached. Delete some files or upgrade your plan.`,
        };
      }

      // Check storage limit (convert fileSize from bytes to GB)
      const fileSizeGB = fileSize / (1024 * 1024 * 1024);
      const remainingStorage = usage.limits.storageGB - usage.current.storageGB;

      if (fileSizeGB > remainingStorage) {
        return {
          allowed: false,
          reason: `File size exceeds remaining storage (${remainingStorage.toFixed(
            2
          )}GB available)`,
        };
      }

      return { allowed: true };
    },
    [usage]
  );

  // Check if user can use TTS
  const checkCanUseTTS = useCallback(
    (characterCount: number = 0) => {
      if (!usage) return { allowed: false, reason: "Usage data not available" };

      const remaining =
        usage.limits.ttsCharacters - usage.current.ttsCharacters;

      if (characterCount > remaining) {
        return {
          allowed: false,
          reason: `Text too long. ${remaining.toLocaleString()} characters remaining this month`,
        };
      }

      return { allowed: true };
    },
    [usage]
  );

  // Get usage percentage for a specific type
  const getUsagePercentage = useCallback(
    (type: "files" | "tts" | "storage") => {
      if (!usage) return 0;

      let current: number;
      let limit: number;

      switch (type) {
        case "files":
          current = usage.current.totalFiles;
          limit = usage.limits.maxFiles;
          break;
        case "tts":
          current = usage.current.ttsCharacters;
          limit = usage.limits.ttsCharacters;
          break;
        case "storage":
          current = usage.current.storageGB;
          limit = usage.limits.storageGB;
          break;
        default:
          return 0;
      }

      if (limit === -1) return 0; // Unlimited
      return Math.min((current / limit) * 100, 100);
    },
    [usage]
  );

  // Check if usage is near limit
  const isNearLimit = useCallback(
    (type: "files" | "tts" | "storage", threshold: number = 80) => {
      return getUsagePercentage(type) >= threshold;
    },
    [getUsagePercentage]
  );

  // Format remaining usage for display
  const formatRemainingUsage = useCallback(
    (type: "files" | "tts" | "storage") => {
      if (!usage) return "Unknown";

      let current: number;
      let limit: number;
      let unit: string;

      switch (type) {
        case "files":
          current = usage.current.totalFiles;
          limit = usage.limits.maxFiles;
          unit = "files";
          break;
        case "tts":
          current = usage.current.ttsCharacters;
          limit = usage.limits.ttsCharacters;
          unit = "characters";
          break;
        case "storage":
          current = usage.current.storageGB;
          limit = usage.limits.storageGB;
          unit = "GB";
          break;
        default:
          return "Unknown";
      }

      if (limit === -1) return "Unlimited";

      const remaining = Math.max(0, limit - current);

      if (type === "tts" && remaining > 1000) {
        return `${(remaining / 1000).toFixed(0)}k characters`;
      }

      if (type === "storage") {
        return `${remaining.toFixed(2)} GB`;
      }

      return `${remaining} ${unit}`;
    },
    [usage]
  );

  // Fetch usage on mount and when user changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Listen for auth state changes with better cleanup
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Small delay to ensure user data is available
        setTimeout(() => {
          fetchUsage();
        }, 500);
      } else if (event === "SIGNED_OUT") {
        setUsage(null);
        setLoading(false);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUsage]);

  // Auto-refresh usage data every 30 seconds when component is active
  useEffect(() => {
    if (!usage) return;

    const interval = setInterval(() => {
      // Only refresh if the tab is visible to avoid unnecessary API calls
      if (document.visibilityState === "visible") {
        fetchUsage();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [usage, fetchUsage]);

  // Listen for window focus to refresh usage data
  useEffect(() => {
    const handleFocus = () => {
      if (usage) {
        fetchUsage();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [usage, fetchUsage]);

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
