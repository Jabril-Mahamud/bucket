import Link from "next/link";
import { BookOpen, Library } from "lucide-react";
import { AuthButton } from "./auth-button";
import { Button } from "./ui/button";
import { ThemeSwitcher } from "./theme-switcher";
import { createClient } from "@/lib/supabase/server";
import { UsageIndicator } from "./billing/usage-indicator";

export async function Header() {
  // Check if user is authenticated to show usage indicator
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center group-hover:bg-primary/90 transition-colors">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline-block font-semibold text-sm tracking-tight">
              Personal Library
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="h-8 px-3">
              <Link href="/library" className="gap-1.5 text-sm font-medium">
                <Library className="h-3.5 w-3.5" />
                Library
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 px-3">
              <Link href="/pricing" className="text-sm font-medium">
                Pricing
              </Link>
            </Button>
          </nav>
        </div>

        

        <div className="flex items-center gap-1">
          {/* Mobile Navigation Links */}
          <div className="md:hidden flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link href="/library">
                <Library className="h-4 w-4" />
                <span className="sr-only">Library</span>
              </Link>
            </Button>
          </div>

          <AuthButton />
          <ThemeSwitcher />
        </div>
      </div>
      
      {/* Mobile Usage Indicator */}
      {user && (
        <div className="lg:hidden border-t border-border/50 px-4 py-2">
          <UsageIndicator compact />
        </div>
      )}
    </header>
  );
}