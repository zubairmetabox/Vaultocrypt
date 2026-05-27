"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  PencilLine,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";

import { RecordFormDialog } from "@/components/app/record-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VaultRecord } from "@/lib/mock-data";

type RecordListProps = {
  initialRecords: VaultRecord[];
};

type DeleteTarget = { id: string; title: string } | null;

let nextId = 10000;
function generateId() {
  return `rec-new-${nextId++}`;
}

export function RecordList({ initialRecords }: RecordListProps) {
  const [records, setRecords] = useState<VaultRecord[]>(initialRecords);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<VaultRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const handleCopy = useCallback(async (record: VaultRecord) => {
    const value = record.type === "credential" ? record.secretValue : record.notes;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopiedId(record.id);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, []);

  function handleSaveNew(draft: Omit<VaultRecord, "id" | "lastUpdated">) {
    const newRecord: VaultRecord = {
      ...draft,
      id: generateId(),
      lastUpdated: "Just now",
    };
    setRecords((prev) => [...prev, newRecord]);
  }

  function handleSaveEdit(draft: Omit<VaultRecord, "id" | "lastUpdated">) {
    if (!editRecord) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editRecord.id
          ? { ...r, ...draft, lastUpdated: "Just now" }
          : r,
      ),
    );
    setEditRecord(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    setDeleteTarget(null);
  }

  return (
    <>
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Records</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add record
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
                <KeyRound className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No records yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add the first credential or secure note for this client.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add record
              </Button>
            </div>
          ) : (
            records.map((record) => {
              const isRevealed = revealedIds.has(record.id);
              const isCopied = copiedId === record.id;
              const isNote = record.type === "secure_note";
              const secretDisplay = isRevealed
                ? (isNote ? record.notes : record.secretValue) || "—"
                : "•".repeat(18);

              return (
                <div
                  key={record.id}
                  className="rounded-[1.5rem] border border-border/70 bg-background/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted">
                          {isNote ? (
                            <StickyNote className="size-3.5 text-muted-foreground" />
                          ) : (
                            <KeyRound className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-foreground">{record.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {isNote ? "secure note" : "credential"}
                        </Badge>
                        <Badge
                          variant={record.sensitivity === "Sensitive" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {record.sensitivity}
                        </Badge>
                      </div>

                      {/* Service / username */}
                      <p className="text-sm text-muted-foreground">
                        {record.service}
                        {!isNote && record.username ? ` · ${record.username}` : ""}
                      </p>

                      {/* Secret or note preview */}
                      <div className="flex items-center gap-2">
                        <code
                          className={`rounded-lg border border-border/50 bg-muted/60 px-2.5 py-1 text-xs ${
                            isRevealed
                              ? "font-mono text-foreground"
                              : "select-none tracking-[0.3em] text-muted-foreground"
                          }`}
                        >
                          {isRevealed && isNote && secretDisplay.length > 80
                            ? secretDisplay.slice(0, 80) + "…"
                            : secretDisplay}
                        </code>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Updated {record.lastUpdated}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={isRevealed ? "default" : "outline"}
                        onClick={() => toggleReveal(record.id)}
                        className="transition-all"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="size-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="size-4" />
                            Reveal
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(record)}
                        disabled={
                          isNote ? !record.notes : !record.secretValue
                        }
                        className="transition-all"
                      >
                        {isCopied ? (
                          <>
                            <ClipboardCheck className="size-4 text-primary" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            Copy
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditRecord(record)}
                      >
                        <PencilLine className="size-4" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() =>
                          setDeleteTarget({ id: record.id, title: record.title })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <RecordFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleSaveNew}
      />

      {/* Edit dialog */}
      <RecordFormDialog
        open={Boolean(editRecord)}
        onOpenChange={(open) => {
          if (!open) setEditRecord(null);
        }}
        record={editRecord ?? undefined}
        onSave={handleSaveEdit}
      />

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record</DialogTitle>
            <DialogDescription>
              Permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>{" "}
              from this client. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
