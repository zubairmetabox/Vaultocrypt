"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Download, FileUp, Loader2, Plus, Trash2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, deleteClients, type ClientRow } from "@/lib/actions/clients";
import { importClients, type ImportClientInput } from "@/lib/actions/import";
import type { CategoryRow } from "@/lib/actions/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  initialClients: ClientRow[];
  categories: CategoryRow[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function csvEscape(value: string | number | null) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function statusLabel(status: "ACTIVE" | "INACTIVE") {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientDirectory({ initialClients, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Add client form state
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newVertical, setNewVertical] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>(() => categories[0]?.id ?? "");
  const addNameRef = useRef<HTMLInputElement>(null);

  // Keep default in sync if categories load after first render
  useEffect(() => {
    setNewCategoryId((prev) => prev || categories[0]?.id || "");
  }, [categories]);

  const clients = initialClients;

  const grouped = useMemo(
    () =>
      clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .reduce<Record<string, ClientRow[]>>((acc, c) => {
          const letter = c.name.charAt(0).toUpperCase();
          if (!acc[letter]) acc[letter] = [];
          acc[letter].push(c);
          return acc;
        }, {}),
    [clients],
  );

  const letters = Object.keys(grouped).sort();
  const allSelected = clients.length > 0 && selectedIds.length === clients.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : clients.map((c) => c.id));
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  function exportCsv() {
    const selected = clients.filter((c) => selectedIds.includes(c.id));
    if (!selected.length) return;

    const header = ["id", "category", "name", "contact", "vertical", "status", "record_count"];
    const rows = selected.map((c) => [
      c.id, c.category, c.name, c.contact, c.vertical, statusLabel(c.status), c.recordCount,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultocrypt-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  function handleDelete() {
    startTransition(async () => {
      await deleteClients(selectedIds);
      setSelectedIds([]);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  function resetAddForm() {
    setNewName("");
    setNewContact("");
    setNewVertical("");
    setNewCategoryId(categories[0]?.id ?? "");
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createClient({
        name: newName,
        contact: newContact,
        vertical: newVertical,
        categoryId: newCategoryId || undefined,
      });
      resetAddForm();
      setAddOpen(false);
      router.refresh();
    });
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(imported: ImportClientInput[]) {
    await importClients(imported);
    router.refresh();
  }

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <CardTitle>Client directory</CardTitle>
              <CardDescription>
                Name-led scanning, visible security posture, and fast access to the next action.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                {allSelected ? "Clear all" : "Select all"}
              </Button>

              {selectedIds.length > 0 && (
                <>
                  <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
                    {selectedIds.length} selected
                  </div>
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="size-4" />
                    Export CSV
                  </Button>
                  <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                          Permanently remove {selectedIds.length} client
                          {selectedIds.length === 1 ? "" : "s"} and all their records. This cannot
                          be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                          {isPending && <Loader2 className="size-4 animate-spin" />}
                          Confirm delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                    Clear selection
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="size-4" />
              Import CSV
            </Button>

            <ImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              onImport={handleImport}
            />

            {/* Add client dialog */}
            <Dialog
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) resetAddForm();
              }}
            >
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
                    Add a new client to the directory.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-name">Client name</Label>
                      <Input
                        id="new-name"
                        ref={addNameRef}
                        placeholder="e.g. Acme Corp"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact">Primary contact email</Label>
                      <Input
                        id="new-contact"
                        placeholder="ops@acme.example"
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-vertical">Industry / vertical</Label>
                      <Input
                        id="new-vertical"
                        placeholder="e.g. Healthcare"
                        value={newVertical}
                        onChange={(e) => setNewVertical(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select
                        value={newCategoryId}
                        onValueChange={setNewCategoryId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newName.trim() || isPending}
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Create client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No clients yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first client or import a CSV to get started.
            </p>
          </div>
        ) : (
          letters.map((letter) => (
            <section key={letter} className="space-y-3">
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {letter}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {grouped[letter].map((client) => {
                  const selected = selectedIds.includes(client.id);
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
                        onCheckedChange={() => toggleSelect(client.id)}
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
                            {client.recordCount} record{client.recordCount === 1 ? "" : "s"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {statusLabel(client.status)}
                          </span>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
