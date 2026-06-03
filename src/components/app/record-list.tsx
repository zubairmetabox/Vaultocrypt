"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";

import { MoveRecordDialog } from "@/components/app/move-record-dialog";
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
import {
  copySecret,
  createRecord,
  deleteRecord,
  revealSecret,
  updateRecord,
} from "@/lib/actions/records";
import type { CategoryWithProjects } from "@/lib/actions/categories";
import type { RecordDraft, RecordFormInput } from "@/components/app/record-form-dialog";
import { useSearch } from "@/contexts/search";
import { useRole } from "@/contexts/role";

export type RecordItem = RecordFormInput & {
  id: string;
  updatedAt: Date;
};

type RecordListProps = {
  projectId: string;
  initialRecords: RecordItem[];
  categories?: CategoryWithProjects[];
};

type DeleteTarget = { id: string; title: string } | null;

function formatDate(date: Date): string {
  return date.toLocaleString("en-GB", {
    timeZone: "Indian/Mauritius",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function RecordList({ projectId, initialRecords, categories }: RecordListProps) {
  const { query } = useSearch();
  const role = useRole();
  const isAdmin = role === "ADMIN";
  const router = useRouter();
  const [isCreating, startCreate] = useTransition();
  const [isEditing, startEdit] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  // Keep local copy in sync when server refreshes props
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  useEffect(() => { setRecords(initialRecords); }, [initialRecords]);

  // Revealed secrets stored client-side only (never in the initial render)
  const [revealedSecrets, setRevealedSecrets] = useState<Map<string, string>>(new Map());
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<RecordItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; title: string } | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reveal ────────────────────────────────────────────────────────────────

  async function handleReveal(record: RecordItem) {
    if (revealedSecrets.has(record.id)) {
      // Hide
      setRevealedSecrets((prev) => {
        const next = new Map(prev);
        next.delete(record.id);
        return next;
      });
      return;
    }
    setRevealingId(record.id);
    try {
      const secret = await revealSecret(record.id);
      setRevealedSecrets((prev) => new Map(prev).set(record.id, secret));
    } finally {
      setRevealingId(null);
    }
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async (record: RecordItem) => {
    // Always call copySecret so the audit event is written even if already revealed
    const value = await copySecret(record.id);
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopiedId(record.id);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
  }, [revealedSecrets]);

  // ── Create ────────────────────────────────────────────────────────────────

  function handleSaveNew(draft: RecordDraft) {
    setCreateError(null);
    const tempId = `optimistic-${Date.now()}`;
    setRecords((prev) => [
      {
        id: tempId,
        title: draft.title,
        type: draft.type,
        serviceName: draft.service || null,
        url: draft.url || null,
        username: draft.username || null,
        notes: draft.notes || null,
        updatedAt: new Date(),
      },
      ...prev,
    ]);

    startCreate(async () => {
      try {
        await createRecord({
          projectId,
          title: draft.title,
          type: draft.type === "credential" ? "CREDENTIAL" : "SECURE_NOTE",
          serviceName: draft.service,
          url: draft.url,
          username: draft.username,
          secretValue: draft.secretValue,
          notes: draft.notes,
        });
        setCreateOpen(false);
        router.refresh();
      } catch {
        setRecords((prev) => prev.filter((r) => r.id !== tempId));
        setCreateError("Failed to create record. Please try again.");
      }
    });
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function handleSaveEdit(draft: RecordDraft) {
    if (!editRecord) return;
    setEditError(null);
    const snapshot = editRecord;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === snapshot.id
          ? {
              ...r,
              title: draft.title,
              type: draft.type,
              serviceName: draft.service || null,
              url: draft.url || null,
              username: draft.username || null,
              notes: draft.notes || null,
              updatedAt: new Date(),
            }
          : r,
      ),
    );

    startEdit(async () => {
      try {
        await updateRecord(snapshot.id, projectId, {
          title: draft.title,
          type: draft.type === "credential" ? "CREDENTIAL" : "SECURE_NOTE",
          serviceName: draft.service,
          url: draft.url,
          username: draft.username,
          secretValue: draft.secretValue || undefined,
          notes: draft.notes,
        });
        setEditRecord(null);
        router.refresh();
      } catch {
        setRecords((prev) => prev.map((r) => (r.id === snapshot.id ? snapshot : r)));
        setEditError("Failed to save changes. Please try again.");
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    const targetId = deleteTarget.id;
    const snapshot = records.find((r) => r.id === targetId);

    setRecords((prev) => prev.filter((r) => r.id !== targetId));
    setRevealedSecrets((prev) => {
      const next = new Map(prev);
      next.delete(targetId);
      return next;
    });

    startDelete(async () => {
      try {
        await deleteRecord(targetId, projectId);
        setDeleteTarget(null);
        router.refresh();
      } catch {
        if (snapshot) setRecords((prev) => [...prev, snapshot]);
        setDeleteError("Failed to delete record. Please try again.");
      }
    });
  }

  const isSearching = query.length >= 3;
  const displayRecords = isSearching
    ? records.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          (r.serviceName?.toLowerCase().includes(q) ?? false)
        );
      })
    : records;

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
                  Add the first credential or secure note for this project.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add record
              </Button>
            </div>
          ) : isSearching && displayRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-dashed border-border/70 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No records match &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground">Try a different title or service name.</p>
            </div>
          ) : (
            displayRecords.map((record) => {
              const secret = revealedSecrets.get(record.id);
              const isRevealed = secret !== undefined;
              const isRevealing = revealingId === record.id;
              const isCopied = copiedId === record.id;
              const isNote = record.type === "secure_note";
              const secretDisplay = isRevealed
                ? (secret || "—")
                : "•".repeat(18);

              return (
                <div
                  key={record.id}
                  className="rounded-[1.5rem] border border-border/70 bg-background/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
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
                      </div>

                      <div className="space-y-0.5">
                        {record.url ? (
                          <div className="flex items-baseline gap-2">
                            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">URL</span>
                            <a
                              href={record.url.startsWith("http") ? record.url : `https://${record.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="min-w-0 truncate text-sm text-foreground hover:underline"
                            >
                              {record.serviceName || record.url}
                            </a>
                          </div>
                        ) : record.serviceName ? (
                          <div className="flex items-baseline gap-2">
                            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Service</span>
                            <span className="text-sm text-foreground">{record.serviceName}</span>
                          </div>
                        ) : null}
                        {!isNote && record.username && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Username</span>
                            <span className="min-w-0 truncate text-sm text-foreground">{record.username}</span>
                          </div>
                        )}
                      </div>

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
                        Updated {formatDate(record.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={isRevealed ? "default" : "outline"}
                        onClick={() => handleReveal(record)}
                        disabled={isRevealing}
                      >
                        {isRevealing ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isRevealed ? (
                          <><EyeOff className="size-4" /> Hide</>
                        ) : (
                          <><Eye className="size-4" /> Reveal</>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(record)}
                        className="transition-all"
                      >
                        {isCopied ? (
                          <><ClipboardCheck className="size-4 text-primary" /> Copied</>
                        ) : (
                          <><Copy className="size-4" /> Copy</>
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

                      {isAdmin && categories && categories.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMoveTarget({ id: record.id, title: record.title })}
                        >
                          <ArrowRightLeft className="size-4" />
                          Move
                        </Button>
                      )}

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: record.id, title: record.title })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <RecordFormDialog
        open={createOpen}
        onOpenChange={(o) => { if (!isCreating) { setCreateOpen(o); if (o) setCreateError(null); } }}
        onSave={handleSaveNew}
        isPending={isCreating}
        error={createError}
      />

      {/* Edit */}
      <RecordFormDialog
        open={Boolean(editRecord)}
        onOpenChange={(o) => { if (!o && !isEditing) { setEditRecord(null); setEditError(null); } }}
        record={editRecord ?? undefined}
        onSave={handleSaveEdit}
        isPending={isEditing}
        error={editError}
      />

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => { if (!o && !isDeleting) setDeleteTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete record</DialogTitle>
            <DialogDescription>
              Permanently remove{" "}
              <span className="font-medium text-foreground">{deleteTarget?.title}</span> from this
              project. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move record */}
      {categories && moveTarget && (
        <MoveRecordDialog
          open={Boolean(moveTarget)}
          onOpenChange={(o) => { if (!o) setMoveTarget(null); }}
          recordId={moveTarget.id}
          recordTitle={moveTarget.title}
          currentProjectId={projectId}
          categories={categories}
        />
      )}
    </>
  );
}
