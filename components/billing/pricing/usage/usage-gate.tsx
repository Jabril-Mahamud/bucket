import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUsage } from "@/lib/stripe/contexts/usage-context";
import { AlertTriangle, Link } from "lucide-react";

interface UsageGateProps {
  type: 'files' | 'tts' | 'storage';
  requiredAmount?: number; // For storage: bytes, for TTS: characters, for uploads: count
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function UsageGate({ type, requiredAmount = 1, children, fallback }: UsageGateProps) {
  const { checkCanUpload, checkCanUseTTS } = useUsage();

  let canProceed = false;
  let reason = '';

  switch (type) {
    case 'files':
      const uploadCheck = checkCanUpload();
      canProceed = uploadCheck.allowed;
      reason = uploadCheck.reason || '';
      break;
    case 'storage':
      const storageCheck = checkCanUpload(requiredAmount);
      canProceed = storageCheck.allowed;
      reason = storageCheck.reason || '';
      break;
    case 'tts':
      const ttsCheck = checkCanUseTTS(requiredAmount);
      canProceed = ttsCheck.allowed;
      reason = ttsCheck.reason || '';
      break;
  }

  if (!canProceed) {
    return fallback || (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {reason}
          <Button asChild variant="link" className="p-0 h-auto ml-2">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}