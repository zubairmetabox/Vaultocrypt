"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  FolderKanban,
  Settings2,
} from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import { clients } from "@/lib/mock-data";
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
  const sortedClients = useMemo(
    () => clients.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const [clientsOpen, setClientsOpen] = useState(
    pathname === "/" || pathname.startsWith("/clients/"),
  );

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/clients/")) {
      setClientsOpen(true);
    }
  }, [pathname]);

  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar/90 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:top-4 sm:h-[calc(100vh-2rem)]">
      <BrandMark />

      <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                "group flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
                pathname === "/" || pathname.startsWith("/clients/")
                  ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <FolderKanban className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span>Clients</span>
            </Link>

            <button
              type="button"
              onClick={() => setClientsOpen((open) => !open)}
              aria-label={clientsOpen ? "Collapse clients list" : "Expand clients list"}
              aria-expanded={clientsOpen}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-transparent text-muted-foreground transition-all duration-200 hover:border-border/70 hover:bg-muted/70 hover:text-foreground",
                clientsOpen && "border-border/70 bg-muted/60 text-foreground",
              )}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  clientsOpen && "rotate-180",
                )}
              />
            </button>
          </div>

          {clientsOpen ? (
            <div className="rounded-[1.4rem] border border-border/70 bg-card/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="sidebar-client-scroll max-h-[22rem] space-y-1 overflow-y-auto pr-1">
              {sortedClients.map((client) => {
                const active = pathname === `/clients/${client.id}`;

                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className={cn(
                      "block rounded-[1rem] px-3 py-2 text-sm transition-all duration-200",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{client.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {client.records.length}
                      </span>
                    </div>
                  </Link>
                );
              })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-2 space-y-2">
          {navigation.slice(1).map((item) => {
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
        </div>
      </nav>
    </aside>
  );
}
