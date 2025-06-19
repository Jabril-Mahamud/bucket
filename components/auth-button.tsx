import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { BookOpen, Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getUserInitials(email: string): string {
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const userInitials = getUserInitials(user.email || '');
    const userName = user.email?.split('@')[0] || 'User';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-2 px-2 data-[state=open]:bg-accent"
          >
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              {userInitials}
            </div>
            <span className="hidden sm:inline-block text-sm font-medium max-w-24 truncate">
              {userName}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/library" className="cursor-pointer">
              <BookOpen className="mr-2 h-4 w-4" />
              My Library
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed">
            <Settings className="mr-2 h-4 w-4" />
            Settings
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <LogoutButton />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost" className="h-8 px-3">
        <Link href="/auth/login" className="text-sm font-medium">
          Sign in
        </Link>
      </Button>
      <Button asChild size="sm" variant="default" className="h-8 px-3">
        <Link href="/auth/sign-up" className="text-sm font-medium">
          Sign up
        </Link>
      </Button>
    </div>
  );
}