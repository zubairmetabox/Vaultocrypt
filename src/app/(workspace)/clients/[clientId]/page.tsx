import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Copy,
  Eye,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientById } from "@/lib/mock-data";

type ClientPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

function statusBadgeVariant(status: string) {
  if (status === "Restricted") return "destructive";
  if (status === "Needs Review") return "secondary";
  return "outline";
}

function auditRiskBadgeVariant(risk: string) {
  if (risk === "Elevated") return "destructive";
  if (risk === "Watched") return "secondary";
  return "outline";
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const client = getClientById(clientId);

  if (!client) {
    notFound();
  }

  const elevatedEvents = client.auditTrail.filter(
    (event) => event.risk === "Elevated" || event.risk === "Watched",
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>{client.name}</CardTitle>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{client.contact}</p>
                <p>{client.vertical}</p>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {client.notes}
              </p>
            </div>

            <Badge variant={statusBadgeVariant(client.status)}>{client.status}</Badge>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.records.map((record) => (
              <div
                key={record.id}
                className="rounded-[1.5rem] border border-border/70 bg-background/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{record.title}</p>
                      <Badge variant="outline">{record.type}</Badge>
                      <Badge
                        variant={
                          record.sensitivity === "Sensitive" ? "secondary" : "outline"
                        }
                      >
                        {record.sensitivity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {record.service} - {record.username}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {record.lastUpdated}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="size-4" />
                      Reveal
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="size-4" />
                      Copy
                    </Button>
                    <Button size="sm">
                      <PencilLine className="size-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
            {elevatedEvents} higher-attention event
            {elevatedEvents === 1 ? "" : "s"} in the latest visible trail.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {client.auditTrail.map((event) => (
            <div
              key={event.id}
              className="rounded-[1.4rem] border border-border/70 bg-card/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.actor}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {event.action} on {event.target}
                  </p>
                </div>
                <Badge variant={auditRiskBadgeVariant(event.risk)}>
                  {event.risk}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>{event.occurredAt}</p>
                <p>{event.channel}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
