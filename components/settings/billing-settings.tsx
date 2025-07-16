// components/settings/billing-settings.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  ExternalLink, 
  Download, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UsageIndicator } from "@/components/billing/usage-indicator";
import Link from "next/link";

export function BillingSettings() {
  const { 
    subscription, 
    loading, 
    error, 
    manageSubscription, 
  } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const sub = subscription?.subscription;
  const planName = sub?.plan_name || 'free';
  const isCanceled = sub?.cancel_at_period_end;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanPrice = (plan: string) => {
    const prices: Record<string, string> = {
      free: '$0/month',
      personal: '$9.99/month',
      professional: '$19.99/month',
      enterprise: '$39.99/month'
    };
    return prices[plan] || '$0/month';
  };

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your subscription details and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold capitalize">{planName} Plan</h3>
              <p className="text-muted-foreground">{getPlanPrice(planName)}</p>
            </div>
            <Badge variant={sub?.status === 'active' ? 'default' : 'secondary'}>
              {sub?.status || 'Active'}
            </Badge>
          </div>

          {sub?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {isCanceled ? 'Cancels on' : 'Next billing date'}: {formatDate(sub.current_period_end)}
              </span>
            </div>
          )}

          {isCanceled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription is set to cancel at the end of the billing period.
                You&apos;ll retain access until then.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            {planName !== 'free' && (
              <Button 
                onClick={manageSubscription}
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Manage Billing
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/pricing">
                <TrendingUp className="h-4 w-4" />
                View Plans
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            Track your usage against your plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageIndicator />
        </CardContent>
      </Card>

      {/* Payment Method */}
      {planName !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Manage your payment methods and billing address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Payment methods are managed through our secure billing portal.
            </p>
            <Button 
              onClick={manageSubscription}
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Update Payment Method
              <ExternalLink className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Download invoices and view past payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Access your complete billing history and download invoices through our billing portal.
          </p>
          <Button 
            onClick={manageSubscription}
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            View Invoices
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}