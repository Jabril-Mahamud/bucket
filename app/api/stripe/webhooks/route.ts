// app/api/stripe/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, STRIPE_PRICE_IDS, type PlanType } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Get the actual type returned by createClient
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }
      
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription, supabase);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice, supabase);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClientType
) {
  console.log('Handling checkout completed:', session.id);
  
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as PlanType;
  
  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await upsertSubscription(subscription, supabase, plan);
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType
) {
  console.log('Handling subscription created:', subscription.id);
  
  const plan = getPlanFromPriceId(subscription.items.data[0].price.id);
  await upsertSubscription(subscription, supabase, plan);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType
) {
  console.log('Handling subscription updated:', subscription.id);
  
  const plan = getPlanFromPriceId(subscription.items.data[0].price.id);
  await upsertSubscription(subscription, supabase, plan);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType
) {
  console.log('Handling subscription deleted:', subscription.id);
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan_name: 'free',
      stripe_subscription_id: null,
      stripe_price_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseClientType
) {
  console.log('Handling payment succeeded:', invoice.id);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = (invoice as any).subscription;
  const subscriptionId = typeof subscription === 'string' 
    ? subscription 
    : subscription?.id;
    
  if (subscriptionId) {
    await supabase
      .from('subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClientType
) {
  console.log('Handling payment failed:', invoice.id);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = (invoice as any).subscription;
  const subscriptionId = typeof subscription === 'string' 
    ? subscription 
    : subscription?.id;
    
  if (subscriptionId) {
    await supabase
      .from('subscriptions')
      .update({ 
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);
  }
}

async function upsertSubscription(
  subscription: Stripe.Subscription,
  supabase: SupabaseClientType,
  plan: PlanType
) {
  // Get customer to find user_id
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  
  if (customer.deleted) {
    console.error('Customer has been deleted');
    return;
  }

  const userId = customer.metadata?.user_id || customer.metadata?.supabase_user_id;
  
  if (!userId) {
    console.error('No user_id found in customer metadata');
    return;
  }

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    plan_name: plan,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error upserting subscription:', error);
  } else {
    console.log('Successfully upserted subscription for user:', userId);
  }
}

function getPlanFromPriceId(priceId: string): PlanType {
  for (const [plan, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return plan as PlanType;
    }
  }
  return 'free'; // Fallback
}