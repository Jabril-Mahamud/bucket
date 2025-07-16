// components/settings/account-settings.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AccountSettingsProps {
  user: User;
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const [email, setEmail] = useState(user.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({ email });
      
      if (error) throw error;
      
      setSuccess(true);
      toast.success("Email update initiated", {
        description: "Please check your new email for a confirmation link.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update email";
      setError(errorMessage);
      toast.error("Update failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, you'd call an API endpoint that handles account deletion
      // including cleaning up Stripe subscriptions, etc.
      toast.error("Account deletion is not implemented in this demo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpdateEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            We&apos;ll send a confirmation link to your new email address.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              Check your email for a confirmation link to complete the update.
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading || email === user.email}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Email
        </Button>
      </form>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">Account ID</h3>
        <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">Member Since</h3>
        <p className="text-sm text-muted-foreground">
          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'Unknown'}
        </p>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button 
          variant="destructive" 
          onClick={handleDeleteAccount}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delete Account
        </Button>
      </div>
    </div>
  );
}