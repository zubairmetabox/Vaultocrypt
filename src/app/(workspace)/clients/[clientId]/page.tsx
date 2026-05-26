import { notFound } from "next/navigation";
import { Copy, Eye, PencilLine } from "lucide-react";

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

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const client = getClientById(clientId);

  if (!client) {
    notFound();
  }

  return (
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{record.title}</p>
                    <Badge variant="outline">{record.type}</Badge>
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
  );
}
