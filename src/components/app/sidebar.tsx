"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  FolderKanban,
  Settings2,
} from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import type { ClientRow } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

type SidebarProps = {
  pathname: string;
  clients: ClientRow[];
};

export function Sidebar({ pathname, clients }: SidebarProps) {
  const clientClients = useMemo(
    () =>
      clients
        .filter((c) => c.category === "CLIENT")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const internalClients = useMemo(
    () =>
      clients
        .filter((c) => c.category === "INTERNAL")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const onClientPath = pathname === "/" || pathname.startsWith("/clients/");

  const [clientsOpen, setClientsOpen] = useState(onClientPath);
  const [internalOpen, setInternalOpen] = useState(onClientPath);

  useEffect(() => {
    if (onClientPath) {
      setClientsOpen(true);
      setInternalOpen(true);
    }
  }, [onClientPath]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <BrandMark />

      <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-hidden">
        {/* ── Clients ─────────────────────────────────────────────────────── */}
        <SidebarSection
          label="Clients"
          icon={FolderKanban}
          href="/"
          active={onClientPath}
          open={clientsOpen}
          onToggle={() => setClientsOpen((o) => !o)}
        >
          {clientClients.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No clients yet</p>
          ) : (
            clientClients.map((client) => (
              <ClientLink key={client.id} client={client} pathname={pathname} />
            ))
          )}
        </SidebarSection>

        {/* ── Internal ─────────────────────────────────────────────────────── */}
        <SidebarSection
          label="Internal"
          icon={Building2}
          href="/?category=internal"
          active={false}
          open={internalOpen}
          onToggle={() => setInternalOpen((o) => !o)}
        >
          {internalClients.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No internal entries yet</p>
          ) : (
            internalClients.map((client) => (
              <ClientLink key={client.id} client={client} pathname={pathname} />
            ))
          )}
        </SidebarSection>

        {/* ── Bottom nav ───────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-1 pt-2">
          {[
            { href: "/activity", label: "Activity", icon: Activity },
            { href: "/settings", label: "Settings", icon: Settings2 },
          ].map((item) => {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarSection({
  label,
  icon: Icon,
  href,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link
          href={href}
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
            active
              ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span>{label}</span>
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={open}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-transparent text-muted-foreground transition-all duration-200 hover:border-border/70 hover:bg-muted/70 hover:text-foreground",
            open && "border-border/70 bg-muted/60 text-foreground",
          )}
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="rounded-[1.4rem] border border-border/70 bg-card/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="sidebar-client-scroll max-h-[18rem] space-y-1 overflow-y-auto pr-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientLink({ client, pathname }: { client: ClientRow; pathname: string }) {
  const active = pathname === `/clients/${client.id}`;
  return (
    <Link
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
        <span className="shrink-0 text-xs text-muted-foreground">{client.recordCount}</span>
      </div>
    </Link>
  );
}
