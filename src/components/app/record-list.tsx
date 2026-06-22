"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRightLeft,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  Expand,
  FileCode2,
  FileText,
  History,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";

import { MoveRecordDialog } from "@/components/app/move-record-dialog";
import { RecordHistoryModal } from "@/components/app/record-history-modal";
import { RecordFormDialog } from "@/components/app/record-form-dialog";
import { ShareModal } from "@/components/app/share-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  uploadEnvFile,
} from "@/lib/actions/records";
import { emitLiveAuditEvent } from "@/lib/audit-client";
import type { CategoryWithProjects } from "@/lib/actions/categories";
import type { RecordDraft, RecordFormInput } from "@/components/app/record-form-dialog";
import { useSearch } from "@/contexts/search";
import { useRole } from "@/contexts/role";
import { safeUrl } from "@/lib/utils";

export type RecordItem = RecordFormInput & {
  id: string;
  hasHistory: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RecordListProps = {
  projectId: string;
  initialRecords: RecordItem[];
  categories?: CategoryWithProjects[];
};

type DeleteTarget = { id: string; title: string } | null;
type CreateType = "credential" | "secure_note";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
type OpenRecordState = {
  id: string;
  title: string;
  content: string;
  isLoading: boolean;
  type: "secure_note" | "env_file";
} | null;

function isOptimisticRecord(recordId: string) {
  return recordId.startsWith("optimistic-");
}

async function writeClipboardText(value: string) {
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
}

function InlineCopyButton({
  fieldKey,
  value,
  copiedField,
  onCopy,
}: {
  fieldKey: string;
  value: string;
  copiedField: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  const copied = copiedField === fieldKey;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCopy(fieldKey, value);
      }}
      title={copied ? "Copied" : "Copy"}
      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <ClipboardCheck className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
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
  const [isUploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const envFileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingEnvEdit, startSaveEnvEdit] = useTransition();
  const [envEditMode, setEnvEditMode] = useState(false);
  const [envEditValue, setEnvEditValue] = useState("");
  const [envEditError, setEnvEditError] = useState<string | null>(null);

  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  const [revealedSecrets, setRevealedSecrets] = useState<Map<string, string>>(new Map());
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fieldCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editRecord, setEditRecord] = useState<RecordItem | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CreateType>("credential");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [moveTarget, setMoveTarget] = useState<{ ids: string[]; titles: string[] } | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [openRecord, setOpenRecord] = useState<OpenRecordState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<{
    id: string;
    title: string;
    serviceName: string | null;
    url: string | null;
    username: string | null;
  } | null>(null);
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

  const copyFieldValue = useCallback(async (key: string, value: string) => {
    if (!value) return;

    await writeClipboardText(value);

    if (fieldCopyTimeoutRef.current) clearTimeout(fieldCopyTimeoutRef.current);
    setCopiedField(key);
    fieldCopyTimeoutRef.current = setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const handleCopy = useCallback(async (record: RecordItem) => {
    setCopyingId(record.id);
    try {
      if (record.type === "secure_note" && !record.hasEncryptedContent) {
        const value = record.notes || "";
        if (!value) return;

        await writeClipboardText(value);

        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        setCopiedId(record.id);
        copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
        return;
      }

      // Kick off the decrypt fetch and hand the Clipboard API a pending promise
      // immediately (no preceding await) — fetching the secret first and only
      // then calling the clipboard API loses the click's user-activation after
      // the server round-trip, so the write silently fails when the secret
      // hasn't been revealed/cached yet.
      const secretPromise = copySecret(record.id);

      let wroteViaClipboardItem = false;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": secretPromise.then((value) => new Blob([value || ""], { type: "text/plain" })),
            }),
          ]);
          wroteViaClipboardItem = true;
        } catch {
          // fall through to the legacy path below
        }
      }

      if (!wroteViaClipboardItem) {
        const value = await secretPromise;
        if (!value) return;
        await writeClipboardText(value);
      }

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopiedId(record.id);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
      emitLiveAuditEvent({ action: "SECRET_COPIED", targetLabel: record.title });
    } finally {
      setCopyingId(null);
    }
  }, []);

  async function handleOpenRecord(record: RecordItem) {
    if ((record.type !== "secure_note" && record.type !== "env_file") || isOptimisticRecord(record.id)) return;

    setEnvEditMode(false);
    setEnvEditError(null);
    const hasEncryptedContent = Boolean(record.hasEncryptedContent);
    const cachedContent = revealedSecrets.get(record.id);
    const initialContent = hasEncryptedContent
      ? cachedContent ?? ""
      : record.notes || "";

    setOpenRecord({
      id: record.id,
      title: record.title,
      content: initialContent,
      isLoading: hasEncryptedContent && !cachedContent,
      type: record.type,
    });

    if (!hasEncryptedContent || cachedContent) return;

    try {
      const secret = await revealSecret(record.id);
      setRevealedSecrets((prev) => new Map(prev).set(record.id, secret));
      emitLiveAuditEvent({ action: "SECRET_REVEALED", targetLabel: record.title });
      setOpenRecord((current) =>
        current && current.id === record.id
          ? { ...current, content: secret, isLoading: false }
          : current,
      );
    } catch {
      setOpenRecord((current) =>
        current && current.id === record.id
          ? { ...current, content: "Unable to open right now.", isLoading: false }
          : current,
      );
    }
  }

  function openCreateDialog(type: CreateType) {
    setCreateType(type);
    setCreateError(null);
    setCreateOpen(true);
  }

  function handleUploadEnvFileClick() {
    envFileInputRef.current?.click();
  }

  async function handleEnvFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    const content = await file.text();

    startUpload(async () => {
      try {
        await uploadEnvFile(projectId, file.name, content);
        emitLiveAuditEvent({ action: "RECORD_CREATED", targetLabel: file.name });
        router.refresh();
      } catch {
        setUploadError(`Failed to upload ${file.name}. Please try again.`);
      }
    });
  }

  async function handleDownload(record: RecordItem) {
    const cached = revealedSecrets.get(record.id);
    const content = cached ?? (await revealSecret(record.id));
    if (!cached) {
      setRevealedSecrets((prev) => new Map(prev).set(record.id, content));
    }
    downloadText(record.title, content);
  }

  async function handleEditEnvFile(record: RecordItem) {
    if (record.type !== "env_file" || isOptimisticRecord(record.id)) return;

    setEnvEditError(null);
    const cachedContent = revealedSecrets.get(record.id);

    setOpenRecord({
      id: record.id,
      title: record.title,
      content: cachedContent ?? "",
      isLoading: !cachedContent,
      type: "env_file",
    });
    setEnvEditValue(cachedContent ?? "");
    setEnvEditMode(true);

    if (cachedContent) return;

    try {
      const secret = await revealSecret(record.id);
      setRevealedSecrets((prev) => new Map(prev).set(record.id, secret));
      emitLiveAuditEvent({ action: "SECRET_REVEALED", targetLabel: record.title });
      setOpenRecord((current) =>
        current && current.id === record.id ? { ...current, content: secret, isLoading: false } : current,
      );
      setEnvEditValue(secret);
    } catch {
      setOpenRecord((current) =>
        current && current.id === record.id
          ? { ...current, content: "Unable to open right now.", isLoading: false }
          : current,
      );
    }
  }

  function handleSaveEnvEdit() {
    if (!openRecord || openRecord.type !== "env_file") return;
    setEnvEditError(null);
    const { id, title } = openRecord;
    const newContent = envEditValue;

    startSaveEnvEdit(async () => {
      try {
        await uploadEnvFile(projectId, title, newContent);
        setRevealedSecrets((prev) => new Map(prev).set(id, newContent));
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, hasHistory: true, updatedAt: new Date() } : r)),
        );
        setOpenRecord((current) =>
          current && current.id === id ? { ...current, content: newContent } : current,
        );
        emitLiveAuditEvent({ action: "RECORD_UPDATED", targetLabel: title });
        setEnvEditMode(false);
        router.refresh();
      } catch {
        setEnvEditError("Failed to save changes. Please try again.");
      }
    });
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
        hasHistory: false,
        createdAt: new Date(),
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

  async function handleEditClick(record: RecordItem) {
    // For encrypted notes not yet revealed: fetch content before opening the form
    if (record.type === "secure_note" && record.hasEncryptedContent && !revealedSecrets.has(record.id)) {
      setEditLoadingId(record.id);
      try {
        const content = await revealSecret(record.id);
        setRevealedSecrets((prev) => new Map(prev).set(record.id, content));
        setEditRecord({ ...record, notes: content });
      } finally {
        setEditLoadingId(null);
      }
    } else {
      setEditRecord({
        ...record,
        notes:
          record.type === "secure_note" && revealedSecrets.has(record.id)
            ? revealedSecrets.get(record.id) ?? record.notes
            : record.notes,
      });
    }
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
              hasHistory: true,
              createdAt: r.createdAt,
              updatedAt: new Date(),
            }
          : r,
      ),
    );

    // Keep revealedSecrets in sync so the inline preview updates immediately
    if (draft.type === "secure_note") {
      if (draft.encryptNote) {
        setRevealedSecrets((prev) => new Map(prev).set(snapshot.id, draft.notes));
      } else {
        setRevealedSecrets((prev) => { const n = new Map(prev); n.delete(snapshot.id); return n; });
      }
    }

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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {displayRecords.length > 0 && (
              <Checkbox
                checked={selectedIds.size === displayRecords.length && displayRecords.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all records"
                className="shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Records / Notes</CardTitle>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && categories && categories.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  const selected = displayRecords.filter((r) => selectedIds.has(r.id));
                  setBulkMoveOpen(true);
                  setMoveTarget({ ids: selected.map((r) => r.id), titles: selected.map((r) => r.title) });
                }}
              >
                <ArrowRightLeft className="size-4" />
                Move
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIds.size === 0}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <div className="h-4 w-px bg-border/70" />
            <input
              ref={envFileInputRef}
              type="file"
              className="hidden"
              onChange={handleEnvFileSelected}
            />
            <Button size="sm" variant="outline" onClick={handleUploadEnvFileClick} disabled={isUploading}>
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload .env
            </Button>
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

        {uploadError && (
          <div className="mx-6 mb-2 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {uploadError}
          </div>
        )}

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
                <Button size="sm" variant="outline" onClick={handleUploadEnvFileClick} disabled={isUploading}>
                  {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload .env
                </Button>
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
              const isCopying = copyingId === record.id;
              const isNote = record.type === "secure_note";
              const isEnvFile = record.type === "env_file";
              const isOptimistic = isOptimisticRecord(record.id);
              const canServerReveal = !isNote || record.hasEncryptedContent;
              const secretDisplay = isRevealed ? (secret || "—") : "•".repeat(18);

              const isSelected = selectedIds.has(record.id);
              const hasBeenEdited = record.hasHistory;

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
                          ) : isEnvFile ? (
                            <FileCode2 className="size-3.5 text-muted-foreground" />
                          ) : (
                            <KeyRound className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-foreground">{record.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {isNote ? "note" : isEnvFile ? "env file" : "credential"}
                        </Badge>
                      </div>

                      {isEnvFile ? (
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {record.uploadedBy ?? "Unknown"}
                        </p>
                      ) : null}

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
                                <InlineCopyButton
                                  fieldKey={`${record.id}:url`}
                                  value={record.url}
                                  copiedField={copiedField}
                                  onCopy={copyFieldValue}
                                />
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
                                <InlineCopyButton
                                  fieldKey={`${record.id}:username`}
                                  value={record.username}
                                  copiedField={copiedField}
                                  onCopy={copyFieldValue}
                                />
                              </div>
                            )}
                          </div>

                          {isEnvFile && isRevealed ? (
                            <pre className="max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-muted/60 px-2.5 py-2 text-xs font-mono whitespace-pre-wrap text-foreground">
                              {secretDisplay}
                            </pre>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              {!isEnvFile && (
                                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Password</span>
                              )}
                              <code
                                className={`rounded-lg border border-border/50 bg-muted/60 px-2.5 py-1 text-xs ${
                                  isRevealed
                                    ? "font-mono text-foreground"
                                    : "select-none tracking-[0.3em] text-muted-foreground"
                                }`}
                              >
                                {secretDisplay}
                              </code>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(record);
                                }}
                                disabled={isCopying}
                                title={isCopied ? "Copied" : "Copy"}
                                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {isCopying ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : isCopied ? (
                                  <ClipboardCheck className="size-3.5 text-primary" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {isOptimistic ? "Saving…" : `Updated ${formatDate(record.updatedAt)}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      {(isNote || isEnvFile) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRecord(record)}
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

                      {(isNote || isEnvFile) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(record)}
                          className="transition-all"
                          disabled={isOptimistic || isCopying}
                        >
                          {isCopying ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : isCopied ? (
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
                      )}

                      {isEnvFile ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEnvFile(record)}
                            disabled={isOptimistic}
                          >
                            <PencilLine className="size-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(record)}
                            disabled={isOptimistic}
                          >
                            <Download className="size-4" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(record)}
                          disabled={isOptimistic || editLoadingId === record.id}
                        >
                          {editLoadingId === record.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <PencilLine className="size-4" />
                          )}
                          Edit
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className={`sm:size-8 sm:p-0 ${!hasBeenEdited ? "cursor-default opacity-25" : ""}`}
                        title={hasBeenEdited ? "View change history" : "No history yet"}
                        onClick={() => hasBeenEdited && setHistoryRecord({ id: record.id, title: record.title, serviceName: record.serviceName, url: record.url, username: record.username })}
                        disabled={isOptimistic || !hasBeenEdited}
                      >
                        <History className="size-4" />
                        <span className="sm:hidden">History</span>
                      </Button>

                      {isAdmin && categories && categories.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setMoveTarget({ ids: [record.id], titles: [record.title] }); setBulkMoveOpen(true); }}
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
                          <span className="sm:hidden">Archive</span>
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

      <RecordHistoryModal
        open={Boolean(historyRecord)}
        onOpenChange={(open) => { if (!open) setHistoryRecord(null); }}
        recordId={historyRecord?.id ?? ""}
        recordTitle={historyRecord?.title ?? ""}
        isAdmin={isAdmin}
        currentValues={{
          title: historyRecord?.title ?? "",
          serviceName: historyRecord?.serviceName ?? null,
          url: historyRecord?.url ?? null,
          username: historyRecord?.username ?? null,
        }}
      />

      {categories && moveTarget && (
        <MoveRecordDialog
          open={bulkMoveOpen}
          onOpenChange={(open) => {
            setBulkMoveOpen(open);
            if (!open) setMoveTarget(null);
          }}
          recordIds={moveTarget.ids}
          recordTitles={moveTarget.titles}
          currentProjectId={projectId}
          categories={categories}
        />
      )}

      <Dialog
        open={Boolean(openRecord)}
        onOpenChange={(open) => {
          if (!open && !isSavingEnvEdit) {
            setOpenRecord(null);
            setEnvEditMode(false);
            setEnvEditError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openRecord?.title ?? (openRecord?.type === "env_file" ? "Env file" : "Note")}</DialogTitle>
            <DialogDescription>
              {openRecord?.type === "env_file"
                ? envEditMode
                  ? "Edit the env file content. Saving replaces your own copy."
                  : "Full env file view with revealed content."
                : "Full note view with revealed content."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            {openRecord?.isLoading ? (
              <div className="flex min-h-48 items-center gap-3 rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {openRecord?.type === "env_file" ? "Revealing file…" : "Revealing note…"}
              </div>
            ) : openRecord?.type === "env_file" && envEditMode ? (
              <Textarea
                value={envEditValue}
                onChange={(e) => setEnvEditValue(e.target.value)}
                rows={14}
                className="font-mono text-sm"
                disabled={isSavingEnvEdit}
              />
            ) : (
              <div className="min-h-48 rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-4">
                {openRecord?.type === "env_file" ? (
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-6 text-foreground">
                    {openRecord?.content || "Empty file"}
                  </pre>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {openRecord?.content || "Empty note"}
                  </p>
                )}
              </div>
            )}
          </div>

          {envEditError && (
            <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {envEditError}
            </div>
          )}

          <DialogFooter>
            {openRecord?.type === "env_file" && envEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnvEditMode(false);
                    setEnvEditError(null);
                  }}
                  disabled={isSavingEnvEdit}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEnvEdit} disabled={isSavingEnvEdit}>
                  {isSavingEnvEdit && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpenRecord(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!openRecord) return;
                    if (!navigator.clipboard) return;
                    try {
                      await navigator.clipboard.writeText(openRecord.content);
                      emitLiveAuditEvent({ action: "SECRET_COPIED", targetLabel: openRecord.title });
                    } catch {
                      // ignore — best-effort copy
                    }
                  }}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
                {openRecord?.type === "env_file" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const record = records.find((r) => r.id === openRecord?.id);
                        if (!record) return;
                        handleDownload(record);
                      }}
                    >
                      <Download className="size-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => {
                        if (!openRecord) return;
                        setEnvEditValue(openRecord.content);
                        setEnvEditMode(true);
                      }}
                    >
                      <PencilLine className="size-4" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      const record = records.find((r) => r.id === openRecord?.id);
                      if (!record) return;
                      setOpenRecord(null);
                      handleEditClick(record);
                    }}
                  >
                    <PencilLine className="size-4" />
                    Edit note
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
