// hooks/useSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionResponse, PlanType } from '@/lib/stripe/types';
import { getStripe } from '@/lib/stripe/client';

interface UseSubscriptionReturn {
  subscription: SubscriptionResponse | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  upgradeToplan: (plan: Exclude<PlanType, 'free'>) => Promise<void>;
  manageSubscription: () => Promise<void>;
  isUpgrading: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/subscription/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data: SubscriptionResponse = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await fetchSubscription();
  }, [fetchSubscription]);

  const upgradeToplan = useCallback(async (plan: Exclude<PlanType, 'free'>) => {
    try {
      setIsUpgrading(true);
      setError(null);

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await getStripe();
      
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Stripe not loaded');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setIsUpgrading(false);
    }
  }, []);

  const manageSubscription = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open portal');
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
    upgradeToplan,
    manageSubscription,
    isUpgrading,
  };
}

// Helper hook for usage information only
export function useUsage() {
  const { subscription, loading, error, refreshSubscription } = useSubscription();

  const usage = subscription?.usage;
  const planName = usage?.planName || 'free';
  
  const getUsagePercentage = useCallback((type: 'uploads' | 'ttsCharacters' | 'storageGB') => {
    if (!usage) return 0;
    
    const current = usage.current[type];
    const limit = usage.limits[type];
    
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  }, [usage]);

  const isNearLimit = useCallback((type: 'uploads' | 'ttsCharacters' | 'storageGB', threshold = 80) => {
    return getUsagePercentage(type) >= threshold;
  }, [getUsagePercentage]);

  const getRemainingUsage = useCallback((type: 'uploads' | 'ttsCharacters' | 'storageGB') => {
    if (!usage) return 0;
    
    const current = usage.current[type];
    const limit = usage.limits[type];
    
    if (limit === -1) return Infinity; // Unlimited
    return Math.max(0, limit - current);
  }, [usage]);

  return {
    usage,
    planName,
    loading,
    error,
    refreshUsage: refreshSubscription,
    getUsagePercentage,
    isNearLimit,
    getRemainingUsage,
  };
}