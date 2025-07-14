// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsage } from '@/lib/stripe/usage-enforcement';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get current usage
    const usage = await getCurrentUsage(user.id);

    const response = {
      subscription: subscription || {
        plan_name: 'free',
        status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
      },
      usage: usage || {
        current: { uploads: 0, ttsCharacters: 0, storageGB: 0 },
        limits: { uploads: 5, ttsCharacters: 25000, storageGB: 1 },
        planName: 'free',
        subscriptionStatus: 'active',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}