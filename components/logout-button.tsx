"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div 
      onClick={logout}
      className="w-full cursor-pointer flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </div>
  );
}