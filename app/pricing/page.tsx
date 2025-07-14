// app/pricing/page.tsx

import { PricingSection } from "@/components/billing/pricing/pricing-section";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, then upgrade as your library grows. All plans include our core features.
          </p>
        </div>

        <PricingSection />
      </div>
    </div>
  );
}