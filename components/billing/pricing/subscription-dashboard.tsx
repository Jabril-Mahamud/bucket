"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  TrendingUp, 
  Settings, 
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Star,
  Zap,
  FileText,
  Loader2,
  ArrowUpRight
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UsageIndicator } from "../usage-indicator";
import Link from "next/link";

interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf?: string;
  description?: string;
}

export function SubscriptionDashboard() {
  const { 
    subscription, 
    loading, 
    error, 
    refreshSubscription, 
    manageSubscription,
    upgradeToplan,
    isUpgrading 
  } = useSubscription();
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch billing history from Stripe
    // For now, we'll simulate it
    const fetchBillingHistory = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        setBillingHistory([
          {
            id: 'in_1234567890',
            amount: 999,
            currency: 'usd',
            status: 'paid',
            created: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
            description: 'Personal Plan - Monthly'
          },
          {
            id: 'in_0987654321',
            amount: 999,
            currency: 'usd', 
            status: 'paid',
            created: Date.now() - (60 * 24 * 60 * 60 * 1000), // 60 days ago
            description: 'Personal Plan - Monthly'
          }
        ]);
      } catch (error) {
        console.error('Error fetching billing history:', error);
      } finally {
        setLoadingBilling(false);
      }
    };

    if (subscription?.subscription?.stripe_subscription_id) {
      fetchBillingHistory();
    } else {
      setLoadingBilling(false);
    }
  }, [subscription]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-destructive">Error loading subscription</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={refreshSubscription} variant="outline">
              Try Again
            </Button>
          </div>
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

  const formatPrice = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'personal': return <Zap className="h-5 w-5 text-blue-600" />;
      case 'professional': return <Star className="h-5 w-5 text-purple-600" />;
      case 'enterprise': return <Crown className="h-5 w-5 text-amber-600" />;
      default: return <FileText className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string, canceled: boolean = false) => {
    if (canceled) {
      return <Badge variant="destructive">Canceling</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      case 'incomplete':
        return <Badge variant="secondary">Incomplete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const planPrices = {
    free: 0,
    personal: 999,
    professional: 1999,
    enterprise: 3999
  };

  const availableUpgrades = Object.entries(planPrices)
    .filter(([plan]) => {
      const currentIndex = Object.keys(planPrices).indexOf(planName);
      const planIndex = Object.keys(planPrices).indexOf(plan);
      return planIndex > currentIndex;
    })
    .map(([plan, price]) => ({ plan, price }));

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPlanIcon(planName)}
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold capitalize">{planName} Plan</h3>
              <p className="text-muted-foreground">
                {planName === 'free' 
                  ? 'Free forever'
                  : `$${(planPrices[planName as keyof typeof planPrices] / 100).toFixed(2)}/month`
                }
              </p>
            </div>
            <div className="text-right space-y-2">
              {getStatusBadge(sub?.status || 'active', !!isCanceled)}
              {sub?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {isCanceled ? 'Ends' : 'Renews'} {formatDate(sub.current_period_end)}
                </p>
              )}
            </div>
          </div>

          {isCanceled && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Subscription Ending
                  </h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                    Your subscription will end on {formatDate(sub?.current_period_end || '')}. 
                    You&apos;ll be moved to the Free plan.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {planName !== 'free' && (
              <Button 
                onClick={manageSubscription}
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Billing
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            
            {availableUpgrades.length > 0 && (
              <Button asChild variant="default" size="sm" className="gap-2">
                <Link href="/pricing">
                  <TrendingUp className="h-4 w-4" />
                  Upgrade Plan
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <UsageIndicator />

      {/* Quick Upgrade Options */}
      {availableUpgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableUpgrades.map(({ plan, price }) => (
                <Card key={plan} className="relative">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getPlanIcon(plan)}
                        <h3 className="font-semibold capitalize">{plan}</h3>
                      </div>
                      <div className="text-2xl font-bold">
                        ${(price / 100).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/month</span>
                      </div>
                      <Button 
                        onClick={() => upgradeToplan(plan as 'personal' | 'professional' | 'enterprise')}
                        disabled={isUpgrading}
                        size="sm" 
                        className="w-full gap-2"
                      >
                        {isUpgrading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Upgrade Now
                            <ArrowUpRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {sub?.stripe_subscription_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBilling ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No billing history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {billingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {invoice.status === 'paid' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{invoice.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.created).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        {formatPrice(invoice.amount, invoice.currency)}
                      </span>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                        {invoice.status}
                      </Badge>
                      {invoice.invoice_pdf && (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Button asChild variant="outline" className="gap-2 justify-start">
              <Link href="/protected">
                <Settings className="h-4 w-4" />
                Account Settings
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="gap-2 justify-start">
              <Link href="/library">
                <FileText className="h-4 w-4" />
                My Library
              </Link>
            </Button>

            {planName !== 'free' && (
              <Button 
                onClick={manageSubscription}
                variant="outline" 
                className="gap-2 justify-start"
              >
                <CreditCard className="h-4 w-4" />
                Update Payment Method
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}

            <Button asChild variant="outline" className="gap-2 justify-start">
              <Link href="/pricing">
                <TrendingUp className="h-4 w-4" />
                View All Plans
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}