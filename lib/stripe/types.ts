// lib/stripe/types.ts
import type { Tables } from '@/lib/supabase/database.types';

export type PlanType = 'free' | 'personal' | 'professional' | 'enterprise';

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
  planName: PlanType;
  subscriptionStatus: string;
}

export interface SubscriptionResponse {
  subscription: Tables<'subscriptions'> | {
    plan_name: PlanType;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  usage: UsageData;
}

export interface CheckoutRequest {
  plan: Exclude<PlanType, 'free'>;
}

export interface CheckoutResponse {
  sessionId: string;
}

export interface PortalResponse {
  url: string;
}

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
  planName?: PlanType;
}