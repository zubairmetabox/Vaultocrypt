"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Info, Link2, Link2Off, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getBundleAuditEvents, type BundleAuditEventRow, type BundleDetail } from "@/lib/actions/sharing";
import { parseUserAgent } from "@/lib/parse-user-agent";

type Props = { bundle: BundleDetail };

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    timeZone: "Indian/Mauritius",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}


type EventMeta = { label: string; icon: React.ElementType; tone: "outline" | "secondary" | "destructive" };

const ACTION_META: Record<string, EventMeta> = {
  SHARE_CREATED:  { label: "Link created",     icon: Link2,     tone: "outline" },
  SHARE_REVEALED: { label: "Secret revealed",  icon: Eye,       tone: "secondary" },
  SHARE_EXPIRED:  { label: "Link expired",     icon: Link2Off,  tone: "destructive" },
};

function AuditEvent({ event }: { event: BundleAuditEventRow }) {
  const [showInfo, setShowInfo] = useState(false);
  const meta = ACTION_META[event.action] ?? {
    label: event.action.replace(/_/g, " ").toLowerCase(),
    icon: ShieldCheck,
    tone: "outline" as const,
  };
  const Icon = meta.icon;
  const hasAccessInfo = Boolean(event.ip);
  const parsed = event.userAgent ? parseUserAgent(event.userAgent) : null;

  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-card/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{meta.label}</p>
            {event.recordTitle && (
              <span className="text-sm text-muted-foreground">
                · <span className="text-foreground">{event.recordTitle}</span>
              </span>
            )}
          </div>

          {hasAccessInfo && (
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle access details"
            >
              <Info className="size-3 shrink-0" />
              <span>{showInfo ? "Hide access details" : "Show access details"}</span>
            </button>
          )}

          {showInfo && hasAccessInfo && (
            <div className="mt-2 rounded-[0.875rem] border border-border/50 bg-muted/40 px-3 py-2.5 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">IP</span>
                <span className="font-mono text-xs text-foreground">{event.ip}</span>
              </div>
              {parsed && (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Browser</span>
                    <span className="text-xs text-foreground">{parsed.browser}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">OS</span>
                    <span className="text-xs text-foreground">{parsed.os}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <Badge variant={meta.tone} className="shrink-0 text-xs">
          {event.action}
        </Badge>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
    </div>
  );
}

export function BundleAuditTrail({ bundle }: Props) {
  const [events, setEvents] = useState<BundleAuditEventRow[]>(bundle.auditEvents);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const fresh = await getBundleAuditEvents(bundle.id);
        setEvents(fresh);
      } catch {
        // Polling failure — keep current events visible
      }
    }, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bundle.id]);

  const revealCount = events.filter((e) => e.action === "SHARE_REVEALED").length;

  return (
    <aside className="rounded-[1.75rem] border border-border/70 bg-background/85 p-4 shadow-sm xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Audit Trail
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Every access and reveal event for this share link.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-2">
          <ShieldCheck className="size-5 text-primary" />
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-border/70 bg-card/70 p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Eye className="size-4 text-primary" />
          <span className="font-medium">
            {revealCount} secret {revealCount === 1 ? "reveal" : "reveals"} recorded
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Each reveal is logged with IP address and browser info.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No audit events yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((event) => (
            <AuditEvent key={event.id} event={event} />
          ))}
        </div>
      )}
    </aside>
  );
}
