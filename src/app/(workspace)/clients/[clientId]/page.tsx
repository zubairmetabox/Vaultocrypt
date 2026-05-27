import { notFound } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { ClientDetailsCard } from "@/components/app/client-details-card";
import { RecordList } from "@/components/app/record-list";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getClientWithRecords } from "@/lib/actions/clients";
import type { VaultRecord } from "@/lib/mock-data";

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

function auditRiskBadgeVariant(risk: string) {
  if (risk === "Elevated") return "destructive";
  if (risk === "Watched") return "secondary";
  return "outline";
}

function formatUpdated(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const client = await getClientWithRecords(clientId);

  if (!client) notFound();

  // Map DB records → VaultRecord shape expected by RecordList
  const records: VaultRecord[] = client.records.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type === "CREDENTIAL" ? "credential" : "secure_note",
    service: r.serviceName ?? "",
    url: r.url ?? "",
    username: r.username ?? "",
    secretValue: "", // never sent in listing — revealed via server action on demand
    notes: r.notes ?? "",
    lastUpdated: formatUpdated(r.updatedAt),
    sensitivity: r.sensitivity === "SENSITIVE" ? "Sensitive" : "Standard",
  }));

  const elevatedEvents = client.auditEvents.filter(
    (e) => e.action === "SECRET_REVEALED" || e.action === "SECRET_COPIED",
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <ClientDetailsCard
          clientId={client.id}
          initialName={client.name}
          initialContact={client.contact ?? ""}
          initialVertical={client.vertical ?? ""}
          initialStatus={client.status === "ACTIVE" ? "Active" : "Inactive"}
        />
        <RecordList clientId={client.id} initialRecords={records} />
      </div>

      <aside className="rounded-[1.75rem] border border-border/70 bg-background/85 p-4 shadow-sm xl:sticky xl:top-6 xl:self-start">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground uppercase">
              Audit Trail
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every reveal, copy, view, and edit tied to this client.
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

        {client.auditEvents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {client.auditEvents.map((event) => {
              const actorName = event.actor
                ? [event.actor.firstName, event.actor.lastName].filter(Boolean).join(" ") ||
                  event.actor.email
                : "System";
              return (
                <div
                  key={event.id}
                  className="rounded-[1.4rem] border border-border/70 bg-card/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{actorName}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {event.action.replace(/_/g, " ").toLowerCase()} · {event.resource}
                      </p>
                    </div>
                    <Badge variant="outline">{event.action}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatUpdated(event.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
