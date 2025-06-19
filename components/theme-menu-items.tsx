"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();
  
  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  return (
    <>
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className="cursor-pointer"
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
          {theme === value && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      ))}
    </>
  );
}