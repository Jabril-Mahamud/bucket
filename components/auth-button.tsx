import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { Badge } from "./ui/badge";
import {
  Settings,
  ChevronDown,
  CreditCard,
  Crown,
  TrendingUp,
  User,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UsageIndicator } from "./billing/usage-indicator";
import { Avatar, AvatarFallback } from "./ui/avatar";

function getUserInitials(email: string): string {
  const parts = email.split("@")[0].split(".");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getPlanIcon(planName: string) {
  switch (planName) {
    case 'personal':
      return <Zap className="h-3 w-3 text-blue-500" />;
    case 'professional':
      return <Sparkles className="h-3 w-3 text-purple-500" />;
    case 'enterprise':
      return <Crown className="h-3 w-3 text-amber-500" />;
    default:
      return <User className="h-3 w-3 text-slate-500" />;
  }
}

function getPlanColor(planName: string) {
  switch (planName) {
    case 'personal':
      return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800';
    case 'professional':
      return 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800';
    case 'enterprise':
      return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800';
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-400 dark:border-slate-800';
  }
}

export async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const userInitials = getUserInitials(user.email || "");
    const userName = user.email?.split("@")[0] || "User";

    // Get subscription info for the dropdown
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name, status")
      .eq("user_id", user.id)
      .single();

    const planName = subscription?.plan_name || "free";
    const isActive = subscription?.status === "active";
    const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 gap-3 px-3 data-[state=open]:bg-accent/50 hover:bg-accent/50 transition-all duration-200"
          >
            <Avatar className="h-7 w-7 ring-2 ring-offset-1 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-semibold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate max-w-20">
                {userName}
              </span>
              <div className="flex items-center gap-1">
                {getPlanIcon(planName)}
                <span className="text-xs text-muted-foreground">
                  {planDisplayName}
                </span>
              </div>
            </div>
            <ChevronDown className="h-3 w-3 opacity-50 transition-transform data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-2">
          <DropdownMenuLabel className="font-normal p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1 min-w-0">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
                <Badge 
                  variant="outline" 
                  className={`w-fit text-xs font-medium ${getPlanColor(planName)} transition-colors`}
                >
                  <div className="flex items-center gap-1">
                    {getPlanIcon(planName)}
                    {planDisplayName} Plan
                    {planName !== "free" && isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="my-2" />
          
          {/* Enhanced Usage Indicator */}
          <div className="p-3 mx-1 mb-2 rounded-lg bg-gradient-to-r from-accent/30 to-accent/10 border border-border/50">
            <UsageIndicator compact className="w-full" />
          </div>
          
          <DropdownMenuSeparator className="my-2" />
          
          <div className="space-y-1">
            <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-accent/50 transition-colors">
              <Link href="/protected" className="flex items-center gap-3 p-2">
                <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  <User className="h-3 w-3" />
                </div>
                <span className="text-sm">Account</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-accent/50 transition-colors">
              <Link href="/settings" className="flex items-center gap-3 p-2">
                <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  <Settings className="h-3 w-3" />
                </div>
                <span className="text-sm">Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="cursor-pointer rounded-md hover:bg-accent/50 transition-colors">
              <Link href="/subscription" className="flex items-center gap-3 p-2">
                <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  <CreditCard className="h-3 w-3" />
                </div>
                <span className="text-sm">Billing</span>
              </Link>
            </DropdownMenuItem>

            {planName === "free" && (
              <>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem asChild className="cursor-pointer rounded-md bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all">
                  <Link href="/pricing" className="flex items-center gap-3 p-2">
                    <div className="p-1 rounded-md bg-primary/20">
                      <TrendingUp className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-primary">Upgrade Plan</span>
                      <p className="text-xs text-primary/70">Unlock more features</p>
                    </div>
                    <Sparkles className="h-3 w-3 text-primary" />
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </div>

          <DropdownMenuSeparator className="my-2" />
          
          <div className="p-1">
            <LogoutButton />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="ghost" className="h-9 px-4 hover:bg-accent/50 transition-colors">
        <Link href="/auth/login" className="text-sm font-medium">
          Sign in
        </Link>
      </Button>
      <Button asChild size="sm" className="h-9 px-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all shadow-sm">
        <Link href="/auth/sign-up" className="text-sm font-medium">
          Sign up
        </Link>
      </Button>
    </div>
  );
}