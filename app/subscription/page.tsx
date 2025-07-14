// app/subscription/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionDashboard } from "@/components/billing/pricing/subscription-dashboard";

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Subscription & Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription, view usage, and update billing information.
            </p>
          </div>

          <SubscriptionDashboard />
        </div>
      </div>
    </div>
  );
}