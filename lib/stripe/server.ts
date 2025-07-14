// lib/stripe/server.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Price mapping - these will need to be set after creating products in Stripe
export const STRIPE_PRICE_IDS = {
  personal: process.env.STRIPE_PRICE_PERSONAL || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
} as const;

// Plan configuration
export const PLAN_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '5 uploads/month',
      '25k TTS characters',
      '1GB storage',
      'Basic file formats',
    ],
  },
  personal: {
    name: 'Personal',
    price: 999, // $9.99 in cents
    priceId: STRIPE_PRICE_IDS.personal,
    features: [
      '100 uploads/month',
      '200k TTS characters',
      '2GB storage',
      'All file formats',
      'Progress sync',
    ],
  },
  professional: {
    name: 'Professional',
    price: 1999, // $19.99 in cents
    priceId: STRIPE_PRICE_IDS.professional,
    features: [
      '500 uploads/month',
      '1M TTS characters',
      '10GB storage',
      'Advanced search',
      'Collections',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 3999, // $39.99 in cents
    priceId: STRIPE_PRICE_IDS.enterprise,
    features: [
      'Unlimited uploads',
      '3M TTS characters',
      '50GB storage',
      'Team sharing',
      'Priority support',
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;