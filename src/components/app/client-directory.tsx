"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";

import { ImportDialog } from "@/components/app/import-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { clients as seedClients, type Client } from "@/lib/mock-data";

function csvEscape(value: string | number) {
  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function ClientDirectory() {
  const [clients, setClients] = useState(seedClients);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const groupedClients = useMemo(
    () =>
      clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .reduce<Record<string, Client[]>>((groups, client) => {
          const letter = client.name.charAt(0).toUpperCase();

          if (!groups[letter]) {
            groups[letter] = [];
          }

          groups[letter].push(client);
          return groups;
        }, {}),
    [clients],
  );

  const letters = Object.keys(groupedClients).sort();
  const selectedClients = clients.filter((client) =>
    selectedClientIds.includes(client.id),
  );
  const allSelected =
    clients.length > 0 && selectedClientIds.length === clients.length;

  function toggleSelection(clientId: string) {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }

  function toggleSelectAll() {
    setSelectedClientIds(allSelected ? [] : clients.map((client) => client.id));
  }

  function clearSelection() {
    setSelectedClientIds([]);
  }

  function exportSelectedToCsv() {
    if (selectedClients.length === 0) {
      return;
    }

    const header = [
      "id",
      "category",
      "name",
      "contact",
      "vertical",
      "status",
      "record_count",
    ];
    const rows = selectedClients.map((client) => [
      client.id,
      client.category,
      client.name,
      client.contact,
      client.vertical,
      client.status,
      client.records.length,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `vaultocrypt-clients-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function deleteSelectedClients() {
    if (selectedClientIds.length === 0) {
      return;
    }

    setClients((current) =>
      current.filter((client) => !selectedClientIds.includes(client.id)),
    );
    setSelectedClientIds([]);
    setDeleteDialogOpen(false);
  }

  function handleImport(importedClients: Array<Omit<Client, "id" | "auditTrail">>) {
    const now = Date.now();
    const newClients: Client[] = importedClients.map((c, i) => ({
      id: `cst-imp-${now}-${i}`,
      ...c,
      auditTrail: [],
    }));
    setClients((prev) => [...prev, ...newClients]);
  }

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <CardTitle>Client directory</CardTitle>
              <CardDescription>
                Name-led scanning, visible security posture, and fast access to the
                next action.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                {allSelected ? "Clear all" : "Select all"}
              </Button>

              {selectedClientIds.length > 0 ? (
                <>
                  <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
                    {selectedClientIds.length} selected
                  </div>
                  <Button size="sm" variant="outline" onClick={exportSelectedToCsv}>
                    <Download className="size-4" />
                    Export CSV
                  </Button>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete selected clients</DialogTitle>
                        <DialogDescription>
                          Remove {selectedClientIds.length} client
                          {selectedClientIds.length === 1 ? "" : "s"} from the
                          current directory view.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteSelectedClients}>
                          Confirm delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear selection
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" variant="outline" onClick={() => setImportDialogOpen(true)}>
              <FileUp className="size-4" />
              Import CSV
            </Button>

            <ImportDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              onImport={handleImport}
            />

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
                <DialogBody>
                  <div className="grid gap-4">
                    <Input placeholder="Client name" />
                    <Input placeholder="Primary contact email" />
                    <Input placeholder="Industry or vertical" />
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Create client</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              {groupedClients[letter].map((client) => {
                const selected = selectedClientIds.includes(client.id);

                return (
                  <div
                    key={client.id}
                    className={`group relative rounded-[1.1rem] border bg-background/95 shadow-sm transition-all duration-200 ${
                      selected
                        ? "border-ring/60 bg-accent/20 shadow-md"
                        : "border-border/70 hover:border-ring/40 hover:bg-accent/35 hover:shadow-md"
                    }`}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelection(client.id)}
                      aria-label={selected ? `Deselect ${client.name}` : `Select ${client.name}`}
                      className="absolute top-3 right-3 z-10 size-5 rounded-full"
                    />

                    <Link
                      href={`/clients/${client.id}`}
                      className="flex min-h-20 flex-col justify-between gap-3 px-4 py-3 pr-12"
                    >
                      <p className="text-sm font-medium tracking-tight text-foreground">
                        {client.name}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          {client.records.length} record
                          {client.records.length === 1 ? "" : "s"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {client.status}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
