import Link from "next/link";
import { ShieldCheck, Search, FolderKanban, Activity, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Clients", icon: FolderKanban },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

type SidebarProps = {
  pathname: string;
};

export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar/90 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/80 bg-card/85 p-3 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-brand-from),var(--color-brand-to))] text-primary-foreground shadow-lg shadow-cyan-950/15">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Vaultocrypt
          </p>
          <p className="text-xs text-muted-foreground">MetaBox internal vault</p>
        </div>
      </div>

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

      <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-card/55 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Security state
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          Hidden-by-default reveals with visible audit posture.
        </p>
      </div>
    </aside>
  );
}
