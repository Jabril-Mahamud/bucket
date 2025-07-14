"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Zap, 
  Star, 
  Crown, 
  Loader2,
  Upload,
  Volume2,
  HardDrive,
  FileText,
  ArrowRight
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'Forever',
    description: 'Perfect for getting started',
    icon: FileText,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    popular: false,
    limits: {
      uploads: 5,
      ttsCharacters: 25000,
      storageGB: 1,
    },
    features: [
      '5 uploads per month',
      '25K TTS characters',
      '1GB storage',
      'Basic file formats',
      'Document conversion',
      'Progress tracking',
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    price: 999,
    period: 'per month',
    description: 'For serious readers and learners',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    popular: true,
    limits: {
      uploads: 100,
      ttsCharacters: 200000,
      storageGB: 2,
    },
    features: [
      '100 uploads per month',
      '200K TTS characters',
      '2GB storage',
      'All file formats',
      'Advanced TTS voices',
      'Cloud sync',
      'Priority support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 1999,
    period: 'per month',
    description: 'For power users and content creators',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    popular: false,
    limits: {
      uploads: 500,
      ttsCharacters: 1000000,
      storageGB: 10,
    },
    features: [
      '500 uploads per month',
      '1M TTS characters',
      '10GB storage',
      'Advanced search',
      'Collections & tags',
      'Bulk operations',
      'API access',
      'Analytics dashboard',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 3999,
    period: 'per month',
    description: 'For teams and organizations',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    popular: false,
    limits: {
      uploads: -1, // Unlimited
      ttsCharacters: 3000000,
      storageGB: 50,
    },
    features: [
      'Unlimited uploads',
      '3M TTS characters',
      '50GB storage',
      'Team collaboration',
      'Advanced permissions',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  },
];

export function PricingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const { subscription, upgradeToplan, isUpgrading } = useSubscription();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check auth status
  useState(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  });

  const handlePlanSelect = async (planId: string) => {
    if (!user) {
      router.push('/auth/login?redirect=/pricing');
      return;
    }

    if (planId === 'free') {
      router.push('/library');
      return;
    }

    setLoading(planId);
    try {
      await upgradeToplan(planId as 'personal' | 'professional' | 'enterprise');
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const getCurrentPlan = () => {
    return subscription?.subscription?.plan_name || 'free';
  };

  const isCurrentPlan = (planId: string) => {
    return getCurrentPlan() === planId;
  };

  const canUpgrade = (planId: string) => {
    const currentPlan = getCurrentPlan();
    const planOrder = ['free', 'personal', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex > currentIndex;
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-muted p-1 rounded-lg">
          <div className="flex items-center gap-4 px-4 py-2">
            <span className="text-sm font-medium">Monthly billing</span>
            <Badge variant="secondary" className="text-xs">
              No annual plans yet
            </Badge>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              plan.popular 
                ? 'ring-2 ring-primary shadow-lg scale-105' 
                : 'hover:scale-105'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className={`w-12 h-12 ${plan.bgColor} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                <plan.icon className={`h-6 w-6 ${plan.color}`} />
              </div>
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <div className="space-y-1">
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                </div>
                <div className="text-sm text-muted-foreground">{plan.period}</div>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Usage Limits */}
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <span>Monthly uploads</span>
                  </div>
                  <span className="font-semibold">{formatNumber(plan.limits.uploads)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-purple-600" />
                    <span>TTS characters</span>
                  </div>
                  <span className="font-semibold">{formatNumber(plan.limits.ttsCharacters)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-green-600" />
                    <span>Storage</span>
                  </div>
                  <span className="font-semibold">{plan.limits.storageGB}GB</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {isCurrentPlan(plan.id) ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : canUpgrade(plan.id) ? (
                <Button 
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loading === plan.id || isUpgrading}
                  className="w-full gap-2"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Upgrade to {plan.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : plan.id === 'free' ? (
                <Button 
                  asChild
                  variant="outline" 
                  className="w-full"
                >
                  <Link href="/auth/sign-up">Get Started Free</Link>
                </Button>
              ) : (
                <Button variant="ghost" className="w-full" disabled>
                  Contact Sales
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 text-center space-y-8">
        <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          <div className="space-y-4">
            <h3 className="font-semibold">Can I change plans anytime?</h3>
            <p className="text-muted-foreground text-sm">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and we&apos;ll prorate the billing accordingly.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">What happens to my files if I downgrade?</h3>
            <p className="text-muted-foreground text-sm">
              Your files remain safe. You&apos;ll just have lower monthly limits going forward. 
              Existing files won&apos;t be deleted.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">How does TTS billing work?</h3>
            <p className="text-muted-foreground text-sm">
              TTS characters reset monthly. Unused characters don&apos;t roll over, 
              but you can always upgrade mid-month for more capacity.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Is there a free trial?</h3>
            <p className="text-muted-foreground text-sm">
              The Free plan is permanent and includes core features. You can start there 
              and upgrade when you need more capacity.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6 mt-16 p-8 bg-primary/5 rounded-2xl">
        <h2 className="text-2xl font-bold">Ready to organize your digital library?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Join thousands of users who have revolutionized how they manage and consume content.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/auth/sign-up">
              Start Free Today
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/library">
              Browse Demo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}