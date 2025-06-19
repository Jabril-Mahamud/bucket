import Link from "next/link";
import { BookOpen, Library } from "lucide-react";
import { AuthButton } from "./auth-button";
import { ThemeSwitcher } from "./theme-switcher";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline-block font-semibold text-lg">
              Personal Library
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/library" className="gap-2">
                <Library className="h-4 w-4" />
                Library
              </Link>
            </Button>
          </nav>
        </div>

        {/* Right side - Auth and Theme */}
        <div className="flex items-center gap-2">
          {/* Mobile Library Link */}
          <div className="md:hidden">
            <Button asChild variant="ghost" size="sm">
              <Link href="/library">
                <Library className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <AuthButton />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}