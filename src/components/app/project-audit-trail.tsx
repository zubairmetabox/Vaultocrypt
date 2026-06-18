"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowRightLeft,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { AuditAction } from "@prisma/client";

import { AuditActorInfo } from "@/components/app/audit-actor-info";
import { AuditOldValues } from "@/components/app/audit-old-values";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectAuditEvents, type ProjectAuditEventRow } from "@/lib/actions/audit-events";
import { subscribeToLiveAuditEvents, type LiveAuditEvent } from "@/lib/audit-client";

type Props = {
  initialEvents: ProjectAuditEventRow[];
  projectId: string;
  role: "ADMIN" | "USER" | "NONE";
};

type ClientAuditEvent = ProjectAuditEventRow & {
  isOptimistic?: boolean;
};

const ACTION_META: Record<
  AuditAction | LiveAuditEvent["action"],
  { label: string; icon: React.ElementType; tone: "outline" | "secondary" | "destructive" }
> = {
  CLIENT_CREATED: { label: "created project", icon: Plus, tone: "outline" },
  CLIENT_UPDATED: { label: "updated project", icon: PencilLine, tone: "outline" },
  CLIENT_DELETED: { label: "deleted project", icon: Trash2, tone: "destructive" },
  RECORD_CREATED: { label: "created record", icon: KeyRound, tone: "outline" },
  RECORD_UPDATED: { label: "updated record", icon: PencilLine, tone: "outline" },
  RECORD_DELETED: { label: "deleted record", icon: Trash2, tone: "destructive" },
  SECRET_REVEALED: { label: "revealed secret", icon: Eye, tone: "secondary" },
  SECRET_COPIED: { label: "copied secret", icon: Copy, tone: "secondary" },
  LOGIN: { label: "signed in", icon: ShieldCheck, tone: "outline" },
  FAILED_LOGIN: { label: "failed sign-in", icon: AlertTriangle, tone: "destructive" },
  ROLE_CHANGED: { label: "changed role", icon: PencilLine, tone: "outline" },
  RESTRICTION_CHANGED: { label: "changed restriction", icon: ShieldCheck, tone: "outline" },
  SHARE_CREATED: { label: "created share link", icon: ArrowRightLeft, tone: "outline" },
  SHARE_REVEALED: { label: "share secret revealed", icon: Eye, tone: "secondary" },
  SHARE_EXPIRED: { label: "expired share link", icon: ShieldCheck, tone: "destructive" },
  DATA_EXPORTED: { label: "exported vault data", icon: ShieldCheck, tone: "destructive" },
  CLIENT_ARCHIVED: { label: "archived project", icon: Trash2, tone: "destructive" },
  CLIENT_RESTORED: { label: "restored project", icon: Plus, tone: "outline" },
  RECORD_ARCHIVED: { label: "archived record", icon: Trash2, tone: "destructive" },
  RECORD_RESTORED: { label: "restored record", icon: Plus, tone: "outline" },
};

function formatUpdated(date: Date): string {
  return date.toLocaleString("en-GB", {
    timeZone: "Indian/Mauritius",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildTarget(event: ClientAuditEvent): string {
  const metadataTitle =
    (typeof event.metadata?.recordTitle === "string" && event.metadata.recordTitle) ||
    (typeof event.metadata?.title === "string" && event.metadata.title) ||
    null;

  if (
    event.action === "RECORD_CREATED" ||
    event.action === "RECORD_UPDATED" ||
    event.action === "RECORD_DELETED" ||
    event.action === "SECRET_REVEALED" ||
    event.action === "SECRET_COPIED"
  ) {
    return metadataTitle ?? event.record?.title ?? "a record";
  }

  if (
    event.action === "CLIENT_CREATED" ||
    event.action === "CLIENT_UPDATED" ||
    event.action === "CLIENT_DELETED"
  ) {
    return (typeof event.metadata?.projectName === "string" && event.metadata.projectName) || event.project?.name || "a project";
  }

  return "";
}

function optimisticEventToRow(
  event: LiveAuditEvent,
  currentActor: { firstName: string | null; lastName: string | null; email: string | null },
): ClientAuditEvent {
  return {
    id: `optimistic-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: event.action,
    resource: event.action.startsWith("CLIENT") ? "project" : "record",
    resourceId: "optimistic",
    metadata: event.targetLabel ? { recordTitle: event.targetLabel, projectName: event.targetLabel } : null,
    createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
    actor: {
      firstName: event.actorName ?? currentActor.firstName,
      lastName: currentActor.lastName,
      email: event.actorEmail ?? currentActor.email,
    },
    project: null,
    record: event.targetLabel ? { title: event.targetLabel } : null,
    isOptimistic: true,
  };
}

export function ProjectAuditTrail({ initialEvents, projectId, role }: Props) {
  const { user } = useUser();
  const [events, setEvents] = useState<ClientAuditEvent[]>(initialEvents);
  const [hasMore, setHasMore] = useState(initialEvents.length === 10);
  const [loadedServerCount, setLoadedServerCount] = useState(initialEvents.length);
  const [isLoadingMore, startLoadingMore] = useTransition();

  const sensitiveEventCount = useMemo(
    () => events.filter((event) => event.action === "SECRET_REVEALED" || event.action === "SECRET_COPIED").length,
    [events],
  );

  useEffect(() => {
    setEvents(initialEvents);
    setHasMore(initialEvents.length === 10);
    setLoadedServerCount(initialEvents.length);
  }, [initialEvents]);

  useEffect(() => {
    return subscribeToLiveAuditEvents((event) => {
      const currentActor = {
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      };
      setEvents((current) => [optimisticEventToRow(event, currentActor), ...current]);
      setLoadedServerCount((current) => current + 1);
    });
  }, [projectId, user]);

  function handleLoadMore() {
    startLoadingMore(async () => {
      const next = await getProjectAuditEvents(projectId, loadedServerCount, 10);
      setEvents((current) => [
        ...current,
        ...next.filter((nextEvent) => !current.some((currentEvent) => currentEvent.id === nextEvent.id)),
      ]);
      setLoadedServerCount((current) => current + next.length);
      setHasMore(next.length === 10);
    });
  }

  return (
    <aside className="rounded-[1.75rem] border border-border/70 bg-background/85 p-4 shadow-sm xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Audit Trail
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Every reveal, copy, view, and edit tied to this project.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/80 p-2">
          <ShieldCheck className="size-5 text-primary" />
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-border/70 bg-card/70 p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <AlertTriangle className="size-4 text-primary" />
          <span className="font-medium">Monitoring enabled</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sensitiveEventCount} sensitive event{sensitiveEventCount === 1 ? "" : "s"} recorded.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No audit events yet.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {events.map((event) => {
              const meta = ACTION_META[event.action];
              const target = buildTarget(event);

              return (
                <div
                  key={event.id}
                  className="rounded-[1.4rem] border border-border/70 bg-card/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <AuditActorInfo
                        firstName={event.actor?.firstName}
                        lastName={event.actor?.lastName}
                        email={event.actor?.email}
                      />
                      <p className="text-sm leading-6 text-muted-foreground">
                        {meta?.label ?? event.action.replace(/_/g, " ").toLowerCase()}
                        {target ? <> · <span className="text-foreground">{target}</span></> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={meta?.tone ?? "outline"}>{event.action}</Badge>
                      {role === "ADMIN" &&
                        event.action === "RECORD_UPDATED" &&
                        !event.isOptimistic &&
                        Boolean(event.metadata?.prev) && (
                          <AuditOldValues auditEventId={event.id} />
                        )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatUpdated(event.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4">
              <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
