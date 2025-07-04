import Link from "next/link";
import { BarChart3, BookOpen, Library } from "lucide-react";
import { AuthButton } from "./auth-button";
import { Button } from "./ui/button";

export function Header() {
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
          <nav className="hidden md:flex items-center">
            <Button asChild variant="ghost" size="sm" className="h-8 px-3">
              <Link href="/library" className="gap-1.5 text-sm font-medium">
                <Library className="h-3.5 w-3.5" />
                Library
              </Link>
            </Button>
             <Button asChild variant="ghost" size="sm" className="h-8 px-3">
              <Link href="/library/usage" className="gap-1.5 text-sm font-medium">
                <BarChart3 className="h-3.5 w-3.5" />
                Usage
              </Link>
            </Button>
          </nav>
        </div>

        {/* Right side - Auth (theme switcher now integrated into AuthButton) */}
        <div className="flex items-center gap-1">
          {/* Mobile Library Link */}
          <div className="md:hidden">
            <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link href="/library">
                <Library className="h-4 w-4" />
                <span className="sr-only">Library</span>
              </Link>
            </Button>
          </div>
          
          <AuthButton />
        </div>
      </div>
    </header>
  );
}