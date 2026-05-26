"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

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
import { clients } from "@/lib/mock-data";

export function ClientDirectory() {
  const groupedClients = clients
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, typeof clients>>((groups, client) => {
      const letter = client.name.charAt(0).toUpperCase();

      if (!groups[letter]) {
        groups[letter] = [];
      }

      groups[letter].push(client);
      return groups;
    }, {});

  const letters = Object.keys(groupedClients).sort();

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Client directory</CardTitle>
            <CardDescription>
              Name-led scanning, visible security posture, and fast access to the
              next action.
            </CardDescription>
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

      <CardContent className="space-y-6">
        {letters.map((letter) => (
          <section key={letter} className="space-y-3">
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {letter}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {groupedClients[letter].map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex min-h-20 flex-col justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-background/95 px-4 py-3 shadow-sm transition-all duration-200 hover:border-ring/40 hover:bg-accent/35 hover:shadow-md"
                >
                  <p className="text-sm font-medium tracking-tight text-foreground">
                    {client.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {client.records.length} record{client.records.length === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
