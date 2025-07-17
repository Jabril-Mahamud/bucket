// components/settings/notification-settings.tsx
"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Calendar,
  TrendingUp,
  FileText,
  CreditCard,
  Save
} from "lucide-react";
import { toast } from "sonner";

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState({
    newFeatures: true,
    usageAlerts: true,
    weeklyDigest: false,
    paymentReceipts: true,
    securityAlerts: true,
  });

  const [pushNotifications, setPushNotifications] = useState({
    fileUploaded: true,
    conversionComplete: true,
    usageLimitWarning: true,
  });

  const [digestFrequency, setDigestFrequency] = useState("weekly");
  const [hasChanges, setHasChanges] = useState(false);

  const handleEmailToggle = (key: keyof typeof emailNotifications) => {
    setEmailNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handlePushToggle = (key: keyof typeof pushNotifications) => {
    setPushNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real app, save to backend
    toast.success("Notification preferences saved");
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-features" className="text-base">
                New Features & Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new features and improvements
              </p>
            </div>
            <Switch
              id="new-features"
              checked={emailNotifications.newFeatures}
              onCheckedChange={() => handleEmailToggle('newFeatures')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="usage-alerts" className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Usage Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Alerts when approaching usage limits
              </p>
            </div>
            <Switch
              id="usage-alerts"
              checked={emailNotifications.usageAlerts}
              onCheckedChange={() => handleEmailToggle('usageAlerts')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest" className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Reading Digest
              </Label>
              <p className="text-sm text-muted-foreground">
                Summary of your reading activity
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={emailNotifications.weeklyDigest}
              onCheckedChange={() => handleEmailToggle('weeklyDigest')}
            />
          </div>

          {emailNotifications.weeklyDigest && (
            <div className="ml-6 space-y-2">
              <Label className="text-sm">Digest Frequency</Label>
              <RadioGroup value={digestFrequency} onValueChange={(value) => {
                setDigestFrequency(value);
                setHasChanges(true);
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily" className="font-normal">Daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="font-normal">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="font-normal">Monthly</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="payment-receipts" className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Receipts
              </Label>
              <p className="text-sm text-muted-foreground">
                Receipts and billing confirmations
              </p>
            </div>
            <Switch
              id="payment-receipts"
              checked={emailNotifications.paymentReceipts}
              onCheckedChange={() => handleEmailToggle('paymentReceipts')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="security-alerts" className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Security Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Important security notifications
              </p>
            </div>
            <Switch
              id="security-alerts"
              checked={emailNotifications.securityAlerts}
              onCheckedChange={() => handleEmailToggle('securityAlerts')}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Push Notifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Push Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="file-uploaded" className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                File Upload Complete
              </Label>
              <p className="text-sm text-muted-foreground">
                When your files are uploaded successfully
              </p>
            </div>
            <Switch
              id="file-uploaded"
              checked={pushNotifications.fileUploaded}
              onCheckedChange={() => handlePushToggle('fileUploaded')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="conversion-complete" className="text-base">
                Conversion Complete
              </Label>
              <p className="text-sm text-muted-foreground">
                When file conversion or TTS is ready
              </p>
            </div>
            <Switch
              id="conversion-complete"
              checked={pushNotifications.conversionComplete}
              onCheckedChange={() => handlePushToggle('conversionComplete')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="usage-warning" className="text-base">
                Usage Limit Warnings
              </Label>
              <p className="text-sm text-muted-foreground">
                When approaching 80% of your limits
              </p>
            </div>
            <Switch
              id="usage-warning"
              checked={pushNotifications.usageLimitWarning}
              onCheckedChange={() => handlePushToggle('usageLimitWarning')}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}