"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRightLeft,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Expand,
  FileText,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";

import { MoveRecordDialog } from "@/components/app/move-record-dialog";
import { RecordFormDialog } from "@/components/app/record-form-dialog";
import { ShareModal } from "@/components/app/share-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveRecord,
  copySecret,
  createRecord,
  revealSecret,
  updateRecord,
} from "@/lib/actions/records";
import { emitLiveAuditEvent } from "@/lib/audit-client";
import type { CategoryWithProjects } from "@/lib/actions/categories";
import type { RecordDraft, RecordFormInput } from "@/components/app/record-form-dialog";
import { useSearch } from "@/contexts/search";
import { useRole } from "@/contexts/role";
import { safeUrl } from "@/lib/utils";

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
type CreateType = "credential" | "secure_note";
type OpenNoteState = {
  id: string;
  title: string;
  content: string;
  isLoading: boolean;
} | null;

function isOptimisticRecord(recordId: string) {
  return recordId.startsWith("optimistic-");
}

function resolveNotePreview(record: RecordItem, revealedSecret?: string) {
  if (record.hasEncryptedContent) {
    return revealedSecret ?? "Hidden note content";
  }

  return record.notes || "Empty note";
}

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

  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const [revealedSecrets, setRevealedSecrets] = useState<Map<string, string>>(new Map());
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<RecordItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("credential");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; title: string } | null>(null);
  const [openNote, setOpenNote] = useState<OpenNoteState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleReveal(record: RecordItem) {
    if (record.type === "secure_note" && !record.hasEncryptedContent) {
      setRevealedSecrets((prev) => {
        const next = new Map(prev);
        if (next.has(record.id)) next.delete(record.id);
        else next.set(record.id, record.notes || "");
        return next;
      });
      return;
    }

    if (revealedSecrets.has(record.id)) {
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
      emitLiveAuditEvent({ action: "SECRET_REVEALED", targetLabel: record.title });
    } finally {
      setRevealingId(null);
    }
  }

  const handleCopy = useCallback(async (record: RecordItem) => {
    if (record.type === "secure_note" && !record.hasEncryptedContent) {
      const value = record.notes || "";
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
      return;
    }

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
    emitLiveAuditEvent({ action: "SECRET_COPIED", targetLabel: record.title });
  }, []);

  async function handleOpenNote(record: RecordItem) {
    if (record.type !== "secure_note" || isOptimisticRecord(record.id)) return;

    const hasEncryptedContent = Boolean(record.hasEncryptedContent);
    const cachedContent = revealedSecrets.get(record.id);
    const initialContent = hasEncryptedContent
      ? cachedContent ?? ""
      : record.notes || "";

    setOpenNote({
      id: record.id,
      title: record.title,
      content: initialContent,
      isLoading: hasEncryptedContent && !cachedContent,
    });

    if (!hasEncryptedContent || cachedContent) return;

    try {
      const secret = await revealSecret(record.id);
      setRevealedSecrets((prev) => new Map(prev).set(record.id, secret));
      emitLiveAuditEvent({ action: "SECRET_REVEALED", targetLabel: record.title });
      setOpenNote((current) =>
        current && current.id === record.id
          ? { ...current, content: secret, isLoading: false }
          : current,
      );
    } catch {
      setOpenNote((current) =>
        current && current.id === record.id
          ? { ...current, content: "Unable to open note right now.", isLoading: false }
          : current,
      );
    }
  }

  function openCreateDialog(type: CreateType) {
    setCreateType(type);
    setCreateError(null);
    setCreateOpen(true);
  }

  function handleSaveNew(draft: RecordDraft) {
    setCreateError(null);
    const tempId = `optimistic-${Date.now()}`;

    setRecords((prev) => [
      {
        id: tempId,
        title: draft.title,
        type: draft.type,
        serviceName: draft.type === "credential" ? draft.service || null : null,
        url: draft.url || null,
        username: draft.username || null,
        notes: draft.type === "secure_note" && !draft.encryptNote ? draft.notes || null : null,
        hasEncryptedContent: draft.type === "secure_note" ? draft.encryptNote : Boolean(draft.secretValue),
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
          serviceName: draft.type === "credential" ? draft.service : undefined,
          url: draft.url,
          username: draft.username,
          secretValue:
            draft.type === "secure_note"
              ? (draft.encryptNote ? draft.notes : undefined)
              : draft.secretValue,
          notes:
            draft.type === "secure_note"
              ? (draft.encryptNote ? undefined : draft.notes)
              : draft.notes,
        });
        emitLiveAuditEvent({ action: "RECORD_CREATED", targetLabel: draft.title });
        setCreateOpen(false);
        router.refresh();
      } catch {
        setRecords((prev) => prev.filter((r) => r.id !== tempId));
        setCreateError("Failed to create record. Please try again.");
      }
    });
  }

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
              serviceName: draft.type === "credential" ? draft.service || null : null,
              url: draft.url || null,
              username: draft.username || null,
              notes: draft.type === "secure_note" && !draft.encryptNote ? draft.notes || null : null,
              hasEncryptedContent: draft.type === "secure_note" ? draft.encryptNote : Boolean(draft.secretValue),
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
          serviceName: draft.type === "credential" ? draft.service : "",
          url: draft.url,
          username: draft.username,
          secretValue:
            draft.type === "secure_note"
              ? (draft.encryptNote ? draft.notes : "")
              : (draft.secretValue || undefined),
          notes:
            draft.type === "secure_note"
              ? (draft.encryptNote ? "" : draft.notes)
              : draft.notes,
        });
        emitLiveAuditEvent({ action: "RECORD_UPDATED", targetLabel: draft.title });
        setEditRecord(null);
        router.refresh();
      } catch {
        setRecords((prev) => prev.map((r) => (r.id === snapshot.id ? snapshot : r)));
        setEditError("Failed to save changes. Please try again.");
      }
    });
  }

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
        await archiveRecord(targetId, projectId);
        emitLiveAuditEvent({ action: "RECORD_ARCHIVED", targetLabel: snapshot?.title ?? deleteTarget.title });
        setDeleteTarget(null);
        router.refresh();
      } catch {
        if (snapshot) setRecords((prev) => [...prev, snapshot]);
        setDeleteError("Failed to delete record. Please try again.");
      }
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === displayRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayRecords.map((r) => r.id)));
    }
  }

  const isSearching = query.length >= 3;
  const displayRecords = isSearching
    ? records.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          (r.serviceName?.toLowerCase().includes(q) ?? false) ||
          (!r.hasEncryptedContent && (r.notes?.toLowerCase().includes(q) ?? false))
        );
      })
    : records;

  return (
    <>
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {displayRecords.length > 0 && (
              <Checkbox
                checked={selectedIds.size === displayRecords.length && displayRecords.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all records"
                className="shrink-0"
              />
            )}
            <div className="space-y-1">
              <CardTitle>Records / Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Credentials stay structured. Notes feel lighter and faster to scan.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openCreateDialog("secure_note")}>
              <FileText className="size-4" />
              Add note
            </Button>
            <Button size="sm" onClick={() => openCreateDialog("credential")}>
              <Plus className="size-4" />
              Add record
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No records or notes yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add the first credential or jot down a quick project note.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openCreateDialog("secure_note")}>
                  <FileText className="size-4" />
                  Add note
                </Button>
                <Button size="sm" onClick={() => openCreateDialog("credential")}>
                  <Plus className="size-4" />
                  Add record
                </Button>
              </div>
            </div>
          ) : isSearching && displayRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-dashed border-border/70 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No records or notes match &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground">Try a different title, service, or note phrase.</p>
            </div>
          ) : (
            displayRecords.map((record) => {
              const secret = revealedSecrets.get(record.id);
              const isRevealed = secret !== undefined;
              const isRevealing = revealingId === record.id;
              const isCopied = copiedId === record.id;
              const isNote = record.type === "secure_note";
              const isOptimistic = isOptimisticRecord(record.id);
              const canServerReveal = !isNote || record.hasEncryptedContent;
              const secretDisplay = isRevealed ? (secret || "—") : "•".repeat(18);

              const isSelected = selectedIds.has(record.id);

              return (
                <div
                  key={record.id}
                  className={
                    isNote
                      ? `rounded-[1.5rem] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "border-primary/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(15,23,42,0.98))]" : "border-amber-200/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.96))]"}`
                      : `rounded-[1.5rem] border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "border-primary/50 bg-accent/30" : "border-border/70 bg-background/95"}`
                  }
                >
                  <div className="flex items-start gap-3">
                    {!isOptimistic && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(record.id)}
                        aria-label={`Select ${record.title}`}
                        className="mt-1 shrink-0"
                      />
                    )}
                  <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={
                            isNote
                              ? "flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-100"
                              : "flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted"
                          }
                        >
                          {isNote ? (
                            <FileText className="size-4" />
                          ) : (
                            <KeyRound className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-foreground">{record.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {isNote ? "note" : "credential"}
                        </Badge>
                      </div>

                      {isNote ? (
                        <div className="space-y-2">
                          {(record.serviceName || record.url) && (
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-100/70">
                              {record.serviceName || record.url}
                            </p>
                          )}

                          <div className="rounded-[1.2rem] border border-amber-200/10 bg-slate-950/18 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/92">
                              {isOptimistic
                                ? "Saving note…"
                                : isRevealed
                                ? resolveNotePreview(record, secret)
                                : record.hasEncryptedContent
                                  ? "Hidden note content"
                                  : resolveNotePreview(record).slice(0, 180)}
                              {!isRevealed &&
                              !record.hasEncryptedContent &&
                              resolveNotePreview(record).length > 180
                                ? "…"
                                : ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-0.5">
                            {record.url ? (
                              <div className="flex items-baseline gap-2">
                                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">URL</span>
                                <a
                                  href={safeUrl(record.url)}
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

                            {record.username && (
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
                              {secretDisplay}
                            </code>
                          </div>
                        </>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {isOptimistic ? "Saving…" : `Updated ${formatDate(record.updatedAt)}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isNote && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenNote(record)}
                          disabled={isOptimistic}
                        >
                          <Expand className="size-4" />
                          Open
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={isRevealed ? "default" : "outline"}
                        onClick={() => handleReveal(record)}
                        disabled={isOptimistic || (canServerReveal && isRevealing)}
                      >
                        {isOptimistic ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving
                          </>
                        ) : canServerReveal && isRevealing ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isRevealed ? (
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
                        className="transition-all"
                        disabled={isOptimistic}
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
                        onClick={() =>
                          setEditRecord({
                            ...record,
                            notes:
                              record.type === "secure_note" && revealedSecrets.has(record.id)
                                ? revealedSecrets.get(record.id) ?? record.notes
                                : record.notes,
                          })
                        }
                        disabled={isOptimistic}
                      >
                        <PencilLine className="size-4" />
                        Edit
                      </Button>

                      {isAdmin && categories && categories.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMoveTarget({ id: record.id, title: record.title })}
                          disabled={isOptimistic}
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
                          disabled={isOptimistic}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <RecordFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!isCreating) {
            setCreateOpen(open);
            if (open) setCreateError(null);
          }
        }}
        defaultType={createType}
        onSave={handleSaveNew}
        isPending={isCreating}
        error={createError}
      />

      <RecordFormDialog
        open={Boolean(editRecord)}
        onOpenChange={(open) => {
          if (!open && !isEditing) {
            setEditRecord(null);
            setEditError(null);
          }
        }}
        record={editRecord ?? undefined}
        onSave={handleSaveEdit}
        isPending={isEditing}
        error={editError}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive record</DialogTitle>
            <DialogDescription>
              Move{" "}
              <span className="font-medium text-foreground">{deleteTarget?.title}</span> to the archive. It can be restored from the project page.
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
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Move to archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating share bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur-md">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? "record" : "records"} selected
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              Share
            </Button>
          </div>
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) setSelectedIds(new Set());
        }}
        projectId={projectId}
        selectedRecords={records
          .filter((r) => selectedIds.has(r.id))
          .map((r) => ({ id: r.id, title: r.title, type: r.type }))}
      />

      {categories && moveTarget && (
        <MoveRecordDialog
          open={Boolean(moveTarget)}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          recordId={moveTarget.id}
          recordTitle={moveTarget.title}
          currentProjectId={projectId}
          categories={categories}
        />
      )}

      <Dialog
        open={Boolean(openNote)}
        onOpenChange={(open) => {
          if (!open) setOpenNote(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openNote?.title ?? "Note"}</DialogTitle>
            <DialogDescription>
              Full note view with revealed content.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            <div className="min-h-48 rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-4">
              {openNote?.isLoading ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Revealing note…
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {openNote?.content || "Empty note"}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNote(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
