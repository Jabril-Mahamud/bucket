"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Loader2, 
  ArrowRight, 
  Star,
  Zap,
  Gift
} from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";

export function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription, refreshSubscription } = useSubscription();

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setLoading(false);
        return;
      }

      try {
        // Wait a moment for webhooks to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh subscription data
        await refreshSubscription();
        setLoading(false);
      } catch (err) {
        console.error("Error verifying checkout:", err);
        setError("Failed to verify checkout session");
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId, refreshSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Processing your subscription...</h2>
          <p className="text-muted-foreground">Please wait while we set up your account.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/pricing">Back to Pricing</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/protected">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planName = subscription?.subscription?.plan_name || 'free';
  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const planBenefits = {
    personal: [
      "100 uploads per month",
      "200K TTS characters",
      "2GB storage",
      "All file formats",
      "Priority support"
    ],
    professional: [
      "500 uploads per month", 
      "1M TTS characters",
      "10GB storage",
      "Advanced search",
      "Collections & tags",
      "API access"
    ],
    enterprise: [
      "Unlimited uploads",
      "3M TTS characters", 
      "50GB storage",
      "Team collaboration",
      "Dedicated support",
      "SLA guarantee"
    ]
  };

  const benefits = planBenefits[planName as keyof typeof planBenefits] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Welcome to {planDisplayName}!</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your subscription has been activated successfully. You now have access to all {planDisplayName} plan features.
            </p>
          </div>

          {/* Plan Info Card */}
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />
                  {planDisplayName} Plan
                </Badge>
              </div>
              <CardTitle>Your New Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-left">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
            
            <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Start Uploading</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your documents and audio files to build your library
                </p>
              </Card>

              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Try TTS Features</h3>
                <p className="text-sm text-muted-foreground">
                  Convert your documents to audio with our advanced TTS
                </p>
              </Card>

              <Card className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Manage Account</h3>
                <p className="text-sm text-muted-foreground">
                  View usage, billing, and manage your subscription
                </p>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/library">
                Go to Library
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/protected">
                View Dashboard
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground max-w-md mx-auto">
            <p>
              Your billing cycle starts today. You can manage your subscription, 
              view invoices, and update payment methods in your account dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}