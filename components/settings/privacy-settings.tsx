// components/settings/privacy-settings.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Lock, 
  Eye, 
  Download, 
  Trash2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export function PrivacySettings() {
  const [settings, setSettings] = useState({
    publicProfile: false,
    shareUsageData: false,
    marketingEmails: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // In a real app, you'd save this to the backend
    toast.success("Privacy settings updated");
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would trigger a data export
      toast.info("Data export initiated", {
        description: "You'll receive an email when your data is ready to download.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!confirm("Are you sure you want to delete all your data? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, this would delete user data
      toast.error("Data deletion is not implemented in this demo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    // In a real app, this would navigate to password change flow
    toast.info("Password change flow would open here");
  };

  return (
    <div className="space-y-6">
      {/* Privacy Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Controls
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-profile" className="text-base">
                Public Profile
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow others to see your reading statistics
              </p>
            </div>
            <Switch
              id="public-profile"
              checked={settings.publicProfile}
              onCheckedChange={() => handleToggle('publicProfile')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="usage-data" className="text-base">
                Share Usage Data
              </Label>
              <p className="text-sm text-muted-foreground">
                Help us improve by sharing anonymous usage statistics
              </p>
            </div>
            <Switch
              id="usage-data"
              checked={settings.shareUsageData}
              onCheckedChange={() => handleToggle('shareUsageData')}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing" className="text-base">
                Marketing Communications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and promotions
              </p>
            </div>
            <Switch
              id="marketing"
              checked={settings.marketingEmails}
              onCheckedChange={() => handleToggle('marketingEmails')}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Security */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Security
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Password</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Ensure your account stays secure with a strong password
            </p>
            <Button variant="outline" onClick={handleChangePassword}>
              Change Password
            </Button>
          </div>

          <div>
            <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Add an extra layer of security to your account
            </p>
            <Button variant="outline" disabled>
              Enable 2FA (Coming Soon)
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Your Data
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Export Your Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download a copy of all your data including files, progress, and settings
            </p>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Data
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Danger Zone:</strong> The following action is irreversible
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium mb-2 text-destructive">Delete All Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete all your files, progress, and settings
            </p>
            <Button 
              variant="destructive" 
              onClick={handleDeleteData}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}