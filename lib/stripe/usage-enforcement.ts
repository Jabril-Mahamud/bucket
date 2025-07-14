// lib/usage-enforcement.ts
import { createClient } from '@/lib/supabase/server';

export interface UsageCheckResult {
  allowed: boolean;
  remaining?: number;
  error?: string;
  currentUsage?: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  limits?: {
    uploads: number;
    ttsCharacters: number;
    storageGB: number;
  };
  planName?: string;
}

export async function checkUsageLimit(
  userId: string,
  usageType: 'upload' | 'tts' | 'storage',
  amount: number = 1
): Promise<UsageCheckResult> {
  try {
    const supabase = await createClient();

    // Get user usage and limits
    const { data, error } = await supabase.rpc('get_user_usage_with_limits', {
      target_user_id: userId,
    });

    if (error) {
      console.error('Error checking usage limits:', error);
      return { 
        allowed: false, 
        error: 'Unable to check usage limits' 
      };
    }

    if (!data || data.length === 0) {
      return { 
        allowed: false, 
        error: 'Unable to retrieve usage information' 
      };
    }

    const usage = data[0];

    // Check subscription status (allow free tier users)
    if (usage.subscription_status !== 'active' && usage.plan_name !== 'free') {
      return { 
        allowed: false, 
        error: 'Active subscription required',
        planName: usage.plan_name
      };
    }

    const currentUsage = {
      uploads: usage.current_uploads,
      ttsCharacters: usage.current_tts_characters,
      storageGB: usage.current_storage_gb,
    };

    const limits = {
      uploads: usage.limit_uploads,
      ttsCharacters: usage.limit_tts_characters,
      storageGB: usage.limit_storage_gb,
    };

    switch (usageType) {
      case 'upload':
        const remainingUploads = usage.limit_uploads === -1 
          ? Infinity 
          : usage.limit_uploads - usage.current_uploads;
        
        if (remainingUploads < amount) {
          return { 
            allowed: false, 
            remaining: Math.max(0, remainingUploads),
            error: 'Monthly upload limit exceeded',
            currentUsage,
            limits,
            planName: usage.plan_name
          };
        }
        return { 
          allowed: true, 
          remaining: remainingUploads === Infinity ? Infinity : remainingUploads,
          currentUsage,
          limits,
          planName: usage.plan_name
        };

      case 'tts':
        const remainingTts = usage.limit_tts_characters - usage.current_tts_characters;
        
        if (remainingTts < amount) {
          return { 
            allowed: false, 
            remaining: Math.max(0, remainingTts),
            error: 'Monthly TTS character limit exceeded',
            currentUsage,
            limits,
            planName: usage.plan_name
          };
        }
        return { 
          allowed: true, 
          remaining: remainingTts,
          currentUsage,
          limits,
          planName: usage.plan_name
        };

      case 'storage':
        // Convert amount from bytes to GB for comparison
        const amountGB = amount / (1024 * 1024 * 1024);
        const remainingStorageGB = usage.limit_storage_gb - usage.current_storage_gb;
        
        if (remainingStorageGB < amountGB) {
          return { 
            allowed: false, 
            remaining: Math.max(0, remainingStorageGB),
            error: 'Storage limit exceeded',
            currentUsage,
            limits,
            planName: usage.plan_name
          };
        }
        return { 
          allowed: true, 
          remaining: remainingStorageGB,
          currentUsage,
          limits,
          planName: usage.plan_name
        };

      default:
        return { 
          allowed: false, 
          error: 'Invalid usage type',
          currentUsage,
          limits,
          planName: usage.plan_name
        };
    }
  } catch (error) {
    console.error('Usage check error:', error);
    return { 
      allowed: false, 
      error: 'Internal error checking usage limits' 
    };
  }
}

// Update usage after successful operation
export async function incrementUsage(
  userId: string,
  usageType: 'upload' | 'tts',
  amount: number,
  fileSizeBytes?: number
) {
  try {
    const supabase = await createClient();

    switch (usageType) {
      case 'upload':
        await supabase.rpc('increment_upload_usage', {
          target_user_id: userId,
          file_size_bytes: fileSizeBytes || 0
        });
        break;

      case 'tts':
        await supabase.rpc('increment_tts_usage', {
          target_user_id: userId,
          character_count: amount
        });
        break;
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
    // Don't throw error here to avoid breaking the main operation
  }
}

// Get current usage for display
export async function getCurrentUsage(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_user_usage_with_limits', {
      target_user_id: userId,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const usage = data[0];

    return {
      current: {
        uploads: usage.current_uploads,
        ttsCharacters: usage.current_tts_characters,
        storageGB: usage.current_storage_gb,
      },
      limits: {
        uploads: usage.limit_uploads,
        ttsCharacters: usage.limit_tts_characters,
        storageGB: usage.limit_storage_gb,
      },
      planName: usage.plan_name,
      subscriptionStatus: usage.subscription_status,
    };
  } catch (error) {
    console.error('Error getting current usage:', error);
    return null;
  }
}