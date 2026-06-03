import { notFound } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { AuditActorInfo } from "@/components/app/audit-actor-info";
import { AuditOldValues } from "@/components/app/audit-old-values";
import { ProjectDetailsCard } from "@/components/app/project-details-card";
import { RecordList } from "@/components/app/record-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCategories } from "@/lib/actions/categories";
import { getProjectWithRecords } from "@/lib/actions/projects";
import { getCurrentRole } from "@/lib/auth/get-role";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

function auditRiskBadgeVariant(risk: string) {
  if (risk === "Elevated") return "destructive";
  if (risk === "Watched") return "secondary";
  return "outline";
}

function formatUpdated(date: Date): string {
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const [project, categories, role] = await Promise.all([
    getProjectWithRecords(projectId),
    getCategories(),
    getCurrentRole(),
  ]);

  if (!project) notFound();

  // Non-admins can only access projects in their assigned categories
  if (role !== "ADMIN" && project.categoryId) {
    const hasAccess = categories.some((c) => c.id === project.categoryId);
    if (!hasAccess) notFound();
  }

  const records = project.records.map((r) => ({
    id: r.id,
    title: r.title,
    type: (r.type === "CREDENTIAL" ? "credential" : "secure_note") as "credential" | "secure_note",
    serviceName: r.serviceName,
    url: r.url,
    username: r.username,
    notes: r.notes,
    updatedAt: r.updatedAt,
  }));

  const elevatedEvents = project.auditEvents.filter(
    (e) => e.action === "SECRET_REVEALED" || e.action === "SECRET_COPIED",
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <ProjectDetailsCard
          projectId={project.id}
          initialName={project.name}
          initialContact={project.contact ?? ""}
          initialVertical={project.vertical ?? ""}
          initialStatus={project.status === "ACTIVE" ? "Active" : "Inactive"}
          currentCategoryId={project.categoryId}
          categories={categories}
        />
        <RecordList projectId={project.id} initialRecords={records} categories={categories} />
      </div>

      <div className="self-start">
      <aside className="rounded-[1.75rem] border border-border/70 bg-background/85 p-4 shadow-sm xl:sticky xl:top-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground uppercase">
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
            {elevatedEvents} sensitive event{elevatedEvents === 1 ? "" : "s"} recorded.
          </p>
        </div>

        {project.auditEvents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {project.auditEvents.map((event) => (
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
                      {event.action.replace(/_/g, " ").toLowerCase()} · {event.resource}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline">{event.action}</Badge>
                    {role === "ADMIN" &&
                      event.action === "RECORD_UPDATED" &&
                      Boolean((event.metadata as Record<string, unknown> | null)?.prev) && (
                        <AuditOldValues auditEventId={event.id} />
                      )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatUpdated(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}
