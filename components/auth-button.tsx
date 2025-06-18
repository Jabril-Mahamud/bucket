import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { Library, User, BookOpen } from "lucide-react";
import { Badge } from "./ui/badge";

export async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Get user's file count for display
    const { count } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return (
      <div className="flex items-center gap-3">
        <Link href="/library">
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Library className="h-4 w-4" />
            Library
            {count !== null && count > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {count}
              </Badge>
            )}
          </Button>
        </Link>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {user.email?.split('@')[0]}
          </span>
        </div>
        
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline" className="gap-2">
        <Link href="/auth/login">
          <User className="h-4 w-4" />
          Sign in
        </Link>
      </Button>
      <Button asChild size="sm" variant="default" className="gap-2">
        <Link href="/auth/sign-up">
          <BookOpen className="h-4 w-4" />
          Get Started
        </Link>
      </Button>
    </div>
  );
}