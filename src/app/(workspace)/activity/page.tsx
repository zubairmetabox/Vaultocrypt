import {
  ArrowRightLeft,
  Copy,
  Eye,
  FolderInput,
  KeyRound,
  LogIn,
  PencilLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { AuditAction } from "@prisma/client";

import { AuditActorInfo } from "@/components/app/audit-actor-info";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<
  AuditAction,
  { label: string; icon: React.ElementType; tone: "outline" | "secondary" | "destructive" }
> = {
  CLIENT_CREATED:      { label: "created project",       icon: Plus,          tone: "outline" },
  CLIENT_UPDATED:      { label: "updated project",       icon: PencilLine,    tone: "outline" },
  CLIENT_DELETED:      { label: "deleted project",       icon: Trash2,        tone: "destructive" },
  RECORD_CREATED:      { label: "created record",        icon: KeyRound,      tone: "outline" },
  RECORD_UPDATED:      { label: "updated record",        icon: PencilLine,    tone: "outline" },
  RECORD_DELETED:      { label: "deleted record",        icon: Trash2,        tone: "destructive" },
  SECRET_REVEALED:     { label: "revealed secret in",    icon: Eye,           tone: "secondary" },
  SECRET_COPIED:       { label: "copied secret in",      icon: Copy,          tone: "secondary" },
  LOGIN:               { label: "signed in",             icon: LogIn,         tone: "outline" },
  FAILED_LOGIN:        { label: "failed sign-in",        icon: ShieldAlert,   tone: "destructive" },
  ROLE_CHANGED:        { label: "changed role for",      icon: UserCog,       tone: "outline" },
  RESTRICTION_CHANGED: { label: "changed restriction on",icon: ShieldCheck,   tone: "outline" },
};

function formatTime(date: Date): string {
  return (
    date.toLocaleString("en-GB", {
      timeZone: "Indian/Mauritius",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

function buildTarget(event: {
  action: AuditAction;
  project: { name: string } | null;
  record: { title: string } | null;
  resourceId: string;
}): string {
  if (
    event.action === "RECORD_CREATED" ||
    event.action === "RECORD_UPDATED" ||
    event.action === "RECORD_DELETED" ||
    event.action === "SECRET_REVEALED" ||
    event.action === "SECRET_COPIED"
  ) {
    return event.record?.title ?? "a record";
  }
  if (
    event.action === "CLIENT_CREATED" ||
    event.action === "CLIENT_UPDATED" ||
    event.action === "CLIENT_DELETED"
  ) {
    return event.project?.name ?? "a project";
  }
  return "";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityPage() {
  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
      project: { select: { name: true } },
      record: { select: { title: true } },
    },
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
                <ShieldCheck className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No activity yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Actions on projects and records will appear here.
                </p>
              </div>
            </div>
          ) : (
            events.map((event) => {
              const meta = ACTION_META[event.action];
              const Icon = meta?.icon ?? ArrowRightLeft;
              const target = buildTarget(event);

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-card/80 p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[1.25rem] bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-1 text-sm text-foreground">
                      <AuditActorInfo
                        firstName={event.actor?.firstName}
                        lastName={event.actor?.lastName}
                        email={event.actor?.email}
                      />
                      <span>
                        {meta?.label ?? event.action.toLowerCase().replace(/_/g, " ")}
                        {target && (
                          <> <span className="font-semibold">{target}</span></>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime(event.createdAt)}
                    </p>
                  </div>
                  <Badge variant={meta?.tone ?? "outline"} className="shrink-0">
                    {event.action.replace(/_/g, " ")}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
