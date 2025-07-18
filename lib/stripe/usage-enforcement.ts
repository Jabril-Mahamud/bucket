// lib/stripe/usage-enforcement.ts
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

// Default limits for free plan
const DEFAULT_FREE_LIMITS = {
  uploads: 5,
  ttsCharacters: 25000,
  storageGB: 1
};

export async function checkUsageLimit(
  userId: string,
  usageType: 'upload' | 'tts' | 'storage',
  amount: number = 1
): Promise<UsageCheckResult> {
  try {
    const supabase = await createClient();

    // First, verify the user exists
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      console.error('User verification failed:', userError);
      // Allow the operation with free tier limits as fallback
      return getFallbackResponse(usageType, amount, true);
    }

    // Get user usage and limits with retry logic
    let retries = 2;
    let lastError = null;
    
    while (retries > 0) {
      try {
        const { data, error } = await supabase.rpc('get_user_usage_with_limits', {
          target_user_id: userId,
        });

        if (!error && data && data.length > 0) {
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
            uploads: usage.current_uploads || 0,
            ttsCharacters: usage.current_tts_characters || 0,
            storageGB: usage.current_storage_gb || 0,
          };

          const limits = {
            uploads: usage.limit_uploads ?? DEFAULT_FREE_LIMITS.uploads,
            ttsCharacters: usage.limit_tts_characters ?? DEFAULT_FREE_LIMITS.ttsCharacters,
            storageGB: usage.limit_storage_gb ?? DEFAULT_FREE_LIMITS.storageGB,
          };

          return checkAgainstLimits(usageType, amount, currentUsage, limits, usage.plan_name || 'free');
        }
        
        lastError = error;
        retries--;
        
        // Wait a bit before retry
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        lastError = err;
        retries--;
      }
    }

    // If we couldn't get usage data after retries, use fallback
    console.error('Failed to get usage data after retries:', lastError);
    return getFallbackResponse(usageType, amount, true);

  } catch (error) {
    console.error('Usage check error:', error);
    // In case of any error, allow the operation with warnings
    return getFallbackResponse(usageType, amount, true);
  }
}

function checkAgainstLimits(
  usageType: 'upload' | 'tts' | 'storage',
  amount: number,
  currentUsage: { uploads: number; ttsCharacters: number; storageGB: number },
  limits: { uploads: number; ttsCharacters: number; storageGB: number },
  planName: string
): UsageCheckResult {
  switch (usageType) {
    case 'upload':
      const remainingUploads = limits.uploads === -1 
        ? Infinity 
        : Math.max(0, limits.uploads - currentUsage.uploads);
      
      if (remainingUploads < amount) {
        return { 
          allowed: false, 
          remaining: remainingUploads,
          error: 'Monthly upload limit exceeded',
          currentUsage,
          limits,
          planName
        };
      }
      return { 
        allowed: true, 
        remaining: remainingUploads,
        currentUsage,
        limits,
        planName
      };

    case 'tts':
      const remainingTts = Math.max(0, limits.ttsCharacters - currentUsage.ttsCharacters);
      
      if (remainingTts < amount) {
        return { 
          allowed: false, 
          remaining: remainingTts,
          error: 'Monthly TTS character limit exceeded',
          currentUsage,
          limits,
          planName
        };
      }
      return { 
        allowed: true, 
        remaining: remainingTts,
        currentUsage,
        limits,
        planName
      };

    case 'storage':
      // Convert amount from bytes to GB for comparison
      const amountGB = amount / (1024 * 1024 * 1024);
      const remainingStorageGB = Math.max(0, limits.storageGB - currentUsage.storageGB);
      
      if (remainingStorageGB < amountGB) {
        return { 
          allowed: false, 
          remaining: remainingStorageGB,
          error: 'Storage limit exceeded',
          currentUsage,
          limits,
          planName
        };
      }
      return { 
        allowed: true, 
        remaining: remainingStorageGB,
        currentUsage,
        limits,
        planName
      };

    default:
      return { 
        allowed: false, 
        error: 'Invalid usage type',
        currentUsage,
        limits,
        planName
      };
  }
}

function getFallbackResponse(
  usageType: 'upload' | 'tts' | 'storage', 
  amount: number,
  allowOperation: boolean
): UsageCheckResult {
  // When we can't check usage, we'll allow the operation but with free tier limits
  const fallbackUsage = { uploads: 0, ttsCharacters: 0, storageGB: 0 };
  const fallbackLimits = DEFAULT_FREE_LIMITS;
  
  if (allowOperation) {
    // Allow the operation but indicate it's using fallback
    return {
      allowed: true,
      currentUsage: fallbackUsage,
      limits: fallbackLimits,
      planName: 'free',
      remaining: usageType === 'upload' ? fallbackLimits.uploads :
                 usageType === 'tts' ? fallbackLimits.ttsCharacters :
                 fallbackLimits.storageGB
    };
  }
  
  return {
    allowed: false,
    error: 'Unable to verify usage limits. Please try again.',
    currentUsage: fallbackUsage,
    limits: fallbackLimits,
    planName: 'free'
  };
}

// Update usage after successful operation with better error handling
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
        const { error: uploadError } = await supabase.rpc('increment_upload_usage', {
          target_user_id: userId,
          file_size_bytes: fileSizeBytes || 0
        });
        if (uploadError) {
          console.error('Error incrementing upload usage:', uploadError);
        }
        break;

      case 'tts':
        const { error: ttsError } = await supabase.rpc('increment_tts_usage', {
          target_user_id: userId,
          character_count: amount
        });
        if (ttsError) {
          console.error('Error incrementing TTS usage:', ttsError);
        }
        break;
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
    // Don't throw error here to avoid breaking the main operation
  }
}

// Get current usage for display with fallback
export async function getCurrentUsage(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_user_usage_with_limits', {
      target_user_id: userId,
    });

    if (error || !data || data.length === 0) {
      // Return default free tier usage
      return {
        current: { uploads: 0, ttsCharacters: 0, storageGB: 0 },
        limits: DEFAULT_FREE_LIMITS,
        planName: 'free',
        subscriptionStatus: 'active',
      };
    }

    const usage = data[0];

    return {
      current: {
        uploads: usage.current_uploads || 0,
        ttsCharacters: usage.current_tts_characters || 0,
        storageGB: usage.current_storage_gb || 0,
      },
      limits: {
        uploads: usage.limit_uploads ?? DEFAULT_FREE_LIMITS.uploads,
        ttsCharacters: usage.limit_tts_characters ?? DEFAULT_FREE_LIMITS.ttsCharacters,
        storageGB: usage.limit_storage_gb ?? DEFAULT_FREE_LIMITS.storageGB,
      },
      planName: usage.plan_name || 'free',
      subscriptionStatus: usage.subscription_status || 'active',
    };
  } catch (error) {
    console.error('Error getting current usage:', error);
    // Return default free tier usage
    return {
      current: { uploads: 0, ttsCharacters: 0, storageGB: 0 },
      limits: DEFAULT_FREE_LIMITS,
      planName: 'free',
      subscriptionStatus: 'active',
    };
  }
}