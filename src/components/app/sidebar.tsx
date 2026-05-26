import Link from "next/link";
import { FolderKanban, Activity, Settings2 } from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Clients", icon: FolderKanban },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

type SidebarProps = {
  pathname: string;
};

export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar/90 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:top-4 sm:h-[calc(100vh-2rem)]">
      <BrandMark />

      <nav className="mt-6 flex flex-1 flex-col gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="size-4 transition-transform duration-200 group-hover:scale-105" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
