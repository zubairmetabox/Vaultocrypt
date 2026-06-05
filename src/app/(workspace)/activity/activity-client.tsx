"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  Copy,
  Eye,
  Info,
  KeyRound,
  Link2,
  Link2Off,
  LogIn,
  PencilLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { AuditAction } from "@prisma/client";
import type { DateRange } from "react-day-picker";

import { AuditActorInfo } from "@/components/app/audit-actor-info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/app/date-range-picker";
import { parseUserAgent } from "@/lib/parse-user-agent";
import type { ActivityActor, ActivityEvent } from "./page";

// ─── Action metadata ──────────────────────────────────────────────────────────

type FilterCategory = "Projects" | "Records" | "Secrets" | "Sharing" | "Auth";

const ACTION_META: Record<
  AuditAction,
  { label: string; icon: React.ElementType; tone: "outline" | "secondary" | "destructive"; category: FilterCategory }
> = {
  CLIENT_CREATED:      { label: "created project",        icon: Plus,       tone: "outline",     category: "Projects" },
  CLIENT_UPDATED:      { label: "updated project",        icon: PencilLine, tone: "outline",     category: "Projects" },
  CLIENT_DELETED:      { label: "deleted project",        icon: Trash2,     tone: "destructive", category: "Projects" },
  RECORD_CREATED:      { label: "created record",         icon: KeyRound,   tone: "outline",     category: "Records"  },
  RECORD_UPDATED:      { label: "updated record",         icon: PencilLine, tone: "outline",     category: "Records"  },
  RECORD_DELETED:      { label: "deleted record",         icon: Trash2,     tone: "destructive", category: "Records"  },
  SECRET_REVEALED:     { label: "revealed secret in",     icon: Eye,        tone: "secondary",   category: "Secrets"  },
  SECRET_COPIED:       { label: "copied secret in",       icon: Copy,       tone: "secondary",   category: "Secrets"  },
  SHARE_REVEALED:      { label: "share secret revealed",  icon: Eye,        tone: "secondary",   category: "Secrets"  },
  SHARE_CREATED:       { label: "created share link for", icon: Link2,      tone: "outline",     category: "Sharing"  },
  SHARE_EXPIRED:       { label: "expired share link for", icon: Link2Off,   tone: "destructive", category: "Sharing"  },
  DATA_EXPORTED:       { label: "exported all vault data", icon: KeyRound,   tone: "destructive", category: "Auth"     },
  LOGIN:               { label: "signed in",              icon: LogIn,      tone: "outline",     category: "Auth"     },
  FAILED_LOGIN:        { label: "failed sign-in",         icon: ShieldAlert,tone: "destructive", category: "Auth"     },
  ROLE_CHANGED:        { label: "changed role for",       icon: UserCog,    tone: "outline",     category: "Auth"     },
  RESTRICTION_CHANGED: { label: "changed restriction on", icon: ShieldCheck,tone: "outline",     category: "Auth"     },
};

// ─── Filters ──────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS: { label: string; value: FilterCategory | "all" }[] = [
  { label: "All",      value: "all" },
  { label: "Projects", value: "Projects" },
  { label: "Records",  value: "Records" },
  { label: "Secrets",  value: "Secrets" },
  { label: "Sharing",  value: "Sharing" },
  { label: "Auth",     value: "Auth" },
];

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1rem] border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Event detail helpers ─────────────────────────────────────────────────────

function getEventTarget(event: ActivityEvent): string {
  const meta = event.metadata ?? {};
  switch (event.action) {
    case "RECORD_CREATED":
    case "RECORD_UPDATED":
    case "RECORD_DELETED":
    case "SECRET_REVEALED":
    case "SECRET_COPIED":
      return (meta.title as string) || (meta.recordTitle as string) || event.record?.title || "a record";
    case "CLIENT_CREATED":
    case "CLIENT_UPDATED":
    case "CLIENT_DELETED":
      return (meta.projectName as string) || event.project?.name || "a project";
    case "SHARE_REVEALED":
      return (meta.recordTitle as string) || "a record";
    case "SHARE_CREATED":
    case "SHARE_EXPIRED":
      return event.project?.name || "a project";
    case "ROLE_CHANGED":
      return (meta.targetEmail as string) || (meta.targetName as string) || "";
    case "RESTRICTION_CHANGED":
      return event.project?.name || event.record?.title || "";
    default:
      return "";
  }
}

function AccessInfoToggle({ ip, userAgent }: { ip: string; userAgent?: string }) {
  const [open, setOpen] = useState(false);
  const parsed = userAgent ? parseUserAgent(userAgent) : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Toggle access details"
      >
        <Info className="size-3 shrink-0" />
        {open ? "Hide details" : "Access details"}
      </button>
      {open && (
        <span className="ml-1 inline-flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="text-xs text-muted-foreground">
            IP: <span className="font-mono text-foreground">{ip}</span>
          </span>
          {parsed && (
            <>
              <span className="text-xs text-muted-foreground">
                Browser: <span className="text-foreground">{parsed.browser}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                OS: <span className="text-foreground">{parsed.os}</span>
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const meta = ACTION_META[event.action];
  const Icon = meta?.icon ?? ArrowRightLeft;
  const target = getEventTarget(event);
  const eventMeta = event.metadata ?? {};
  const isShareReveal = event.action === "SHARE_REVEALED";
  const ip = eventMeta.ip as string | undefined;
  const ua = eventMeta.userAgent as string | undefined;

  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-border/70 bg-card/80 p-4">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[1.1rem] bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-foreground">
          {isShareReveal ? (
            <span className="font-medium text-foreground">External visitor</span>
          ) : (
            <AuditActorInfo
              firstName={event.actor?.firstName}
              lastName={event.actor?.lastName}
              email={event.actor?.email}
            />
          )}
          <span className="text-muted-foreground">
            {meta?.label ?? event.action.toLowerCase().replace(/_/g, " ")}
          </span>
          {target && <span className="font-semibold text-foreground">{target}</span>}
          {isShareReveal && event.project?.name && (
            <span className="text-muted-foreground">
              in <span className="font-medium text-foreground">{event.project.name}</span>
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <p className="text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleString("en-GB", {
              timeZone: "Indian/Mauritius",
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", hour12: false,
            })}
          </p>
          {isShareReveal && ip && <AccessInfoToggle ip={ip} userAgent={ua} />}
        </div>
      </div>
      <Badge variant={meta?.tone ?? "outline"} className="mt-0.5 shrink-0 text-xs">
        {event.action.replace(/_/g, " ")}
      </Badge>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = { events: ActivityEvent[]; actors: ActivityActor[] };

export function ActivityClient({ events, actors }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory | "all">("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const hasActiveFilters = categoryFilter !== "all" || actorFilter !== "all" || Boolean(dateRange?.from || dateRange?.to);

  function clearAll() {
    setCategoryFilter("all");
    setActorFilter("all");
    setDateRange(undefined);
  }

  const filtered = events.filter((e) => {
    if (categoryFilter !== "all" && ACTION_META[e.action]?.category !== categoryFilter) return false;

    if (actorFilter !== "all") {
      if (!e.actor) return false;
      const matchedActor = actors.find((a) => a.id === actorFilter);
      if (!matchedActor || e.actor.email !== matchedActor.email) return false;
    }

    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      if (new Date(e.createdAt) < from) return false;
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      if (new Date(e.createdAt) > to) return false;
    }

    return true;
  });

  function actorLabel(a: ActivityActor): string {
    return [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email || a.id;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="border-border/70 bg-card/95">
        <CardContent className="space-y-4 pt-4">
          {/* Type chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">Type</span>
            {CATEGORY_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={categoryFilter === f.value}
                onClick={() => setCategoryFilter(f.value as FilterCategory | "all")}
              />
            ))}
          </div>

          {/* User + date range row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Actor dropdown */}
            <div className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">User</span>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger className="h-8 w-48 rounded-[1rem] text-xs">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {actorLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </CardContent>
      </Card>

      {/* Event list */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Activity</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 gap-1 text-xs">
                <X className="size-3" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
                <ShieldCheck className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No events match these filters</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try adjusting the filters above.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          ) : (
            filtered.map((event) => <EventRow key={event.id} event={event} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
