"use client";

import { ShieldAlert, Copy, Eye, PencilLine, Plus, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { clients } from "@/lib/mock-data";

function statusBadgeVariant(status: string) {
  if (status === "Restricted") return "destructive";
  if (status === "Needs Review") return "secondary";
  return "outline";
}

export function ClientDirectory() {
  const featuredClient = clients[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden border-border/70 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-card)_92%,white),color-mix(in_srgb,var(--color-accent)_52%,var(--color-card)))] shadow-[0_24px_70px_-45px_rgba(14,116,144,0.45)]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="w-fit bg-card/70">
                  Client-first workspace
                </Badge>
                <div>
                  <CardTitle className="text-2xl tracking-tight sm:text-3xl">
                    Quick access without losing security posture
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                    Vaultocrypt starts with the daily MetaBox flow: identify a
                    client fast, get to the right record, reveal or copy only on
                    intent, and keep the trail visible.
                  </CardDescription>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" className="shadow-lg shadow-cyan-900/10">
                    <Plus className="size-4" />
                    Add client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create client</DialogTitle>
                    <DialogDescription>
                      First-pass modal flow for the client-first setup path.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <Input placeholder="Client name" />
                    <Input placeholder="Primary contact email" />
                    <Input placeholder="Industry or vertical" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create client</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border/80 bg-card/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Internal scope
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                MetaBox-only usage before public product expansion.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/80 bg-card/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Secret handling
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Reveal and copy are explicit actions, not passive reads.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/80 bg-card/70 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Experience
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Polished, mobile-ready, and tuned for client context first.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-4 text-cyan-700" />
              Focus client
            </CardTitle>
            <CardDescription>
              Lean client header, then immediate access to records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-muted/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {featuredClient.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {featuredClient.contact} • {featuredClient.vertical}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(featuredClient.status)}>
                  {featuredClient.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {featuredClient.notes}
              </p>
            </div>

            <div className="space-y-3">
              {featuredClient.records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-[1.5rem] border border-border/70 bg-background/90 p-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{record.title}</p>
                        <Badge variant="outline">{record.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {record.service} • {record.username}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
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
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Client directory</CardTitle>
              <CardDescription>
                Name-led scanning, visible security posture, and fast access to
                the next action.
              </CardDescription>
            </div>

            <div className="flex w-full max-w-md items-center gap-2 rounded-[1.25rem] border border-border/70 bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search clients, services, or notes"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1.1fr] gap-4 px-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:grid">
            <span>Client</span>
            <span>Contact</span>
            <span>Status</span>
            <span>Recent records</span>
          </div>

          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-[1.75rem] border border-border/70 bg-background/95 px-4 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_0.8fr_1.1fr] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold tracking-tight text-foreground">
                      {client.name}
                    </p>
                    {client.status === "Restricted" ? (
                      <ShieldAlert className="size-4 text-amber-600" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {client.vertical}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">{client.contact}</div>

                <div>
                  <Badge variant={statusBadgeVariant(client.status)}>
                    {client.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {client.records.slice(0, 2).map((record, index) => (
                    <div key={record.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-foreground">
                          {record.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {record.lastUpdated}
                        </span>
                      </div>
                      {index < Math.min(client.records.length, 2) - 1 ? (
                        <Separator className="mt-2" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
