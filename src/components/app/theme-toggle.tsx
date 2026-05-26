"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;
        const description =
          option.value === "system" && mounted
            ? `Following ${resolvedTheme ?? "system"}`
            : null;

        return (
          <div key={option.value} className="space-y-1">
            <Button
              type="button"
              variant={active ? "default" : "outline"}
              className={cn(
                "min-w-24 justify-start",
                !mounted && "opacity-80",
              )}
              onClick={() => setTheme(option.value)}
            >
              <Icon className="size-4" />
              {option.label}
            </Button>
            {description ? (
              <p className="px-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
