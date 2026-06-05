"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getRecordHistory,
  revealAuditValues,
  type RecordHistoryEntry,
} from "@/lib/actions/records";

type Props = {
  recordId: string;
  recordTitle: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  type: "Type",
  serviceName: "Service",
  url: "URL",
  username: "Username",
  secretValue: "Password",
  notes: "Notes",
  sensitivity: "Sensitivity",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-GB", {
    timeZone: "Indian/Mauritius",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function RecordHistoryModal({ recordId, recordTitle, isAdmin, open, onOpenChange }: Props) {
  const [history, setHistory] = useState<RecordHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Map<string, string>>(new Map());
  const [revealingId, setRevealingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setHistory(null);
    setRevealedSecrets(new Map());
    getRecordHistory(recordId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, recordId]);

  async function handleRevealSecret(eventId: string) {
    setRevealingId(eventId);
    try {
      const values = await revealAuditValues(eventId);
      setRevealedSecrets((prev) => new Map(prev).set(eventId, values.secret ?? ""));
    } finally {
      setRevealingId(null);
    }
  }

  function handleHideSecret(eventId: string) {
    setRevealedSecrets((prev) => {
      const next = new Map(prev);
      next.delete(eventId);
      return next;
    });
  }

  const entryCount = history?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] max-w-md flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-muted">
              <History className="size-4 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">{recordTitle}</DialogTitle>
              <DialogDescription className="text-xs">
                {loading ? "Loading…" : entryCount === 0 ? "No changes yet" : `${entryCount} change${entryCount === 1 ? "" : "s"}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && entryCount === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <History className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              <p className="text-xs text-muted-foreground/60">Edit this record to start building history.</p>
            </div>
          )}

          {!loading && history && entryCount > 0 && (
            <div className="relative px-6 py-4">
              {/* Timeline spine */}
              <div className="absolute left-[2.35rem] top-6 bottom-6 w-px bg-border/50" />

              <div className="space-y-6">
                {history.map((entry, idx) => {
                  const revealedSecret = revealedSecrets.get(entry.id);
                  const isRevealingThis = revealingId === entry.id;

                  // Build visible field rows
                  const rows: { key: string; label: string; content: React.ReactNode }[] = [];

                  for (const field of entry.updatedFields) {
                    if (field === "secretValue") {
                      if (!entry.prev.hasPrevSecret) continue;
                      rows.push({
                        key: "secretValue",
                        label: FIELD_LABELS.secretValue,
                        content: (
                          <div className="flex items-center gap-2">
                            {revealedSecret !== undefined ? (
                              <code className="min-w-0 flex-1 break-all rounded-lg border border-border/50 bg-background px-2.5 py-1 font-mono text-xs text-foreground">
                                {revealedSecret || "—"}
                              </code>
                            ) : (
                              <code className="min-w-0 flex-1 select-none rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs tracking-[0.28em] text-muted-foreground">
                                ●●●●●●●●●●●
                              </code>
                            )}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 shrink-0"
                                disabled={isRevealingThis}
                                onClick={() =>
                                  revealedSecret !== undefined
                                    ? handleHideSecret(entry.id)
                                    : handleRevealSecret(entry.id)
                                }
                              >
                                {isRevealingThis ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : revealedSecret !== undefined ? (
                                  <EyeOff className="size-3.5" />
                                ) : (
                                  <Eye className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        ),
                      });
                      continue;
                    }

                    const prevKey = field as keyof typeof entry.prev;
                    const prevValue = entry.prev[prevKey];
                    if (!prevValue || prevValue === true) continue;

                    rows.push({
                      key: field,
                      label: FIELD_LABELS[field] ?? field,
                      content: (
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                          {String(prevValue)}
                        </span>
                      ),
                    });
                  }

                  if (rows.length === 0) return null;

                  return (
                    <div key={entry.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                        <div className={`size-2 rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      </div>

                      {/* Entry card */}
                      <div className="flex-1 overflow-hidden rounded-[1rem] border border-border/60 bg-card/80">
                        {/* Entry header */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3.5 py-2.5">
                          <span className="text-xs font-medium text-foreground/80">
                            {formatDate(entry.createdAt)}
                          </span>
                          {entry.actorName && (
                            <span className="truncate text-xs text-muted-foreground">
                              {entry.actorName}
                            </span>
                          )}
                        </div>

                        {/* Field rows */}
                        <div className="divide-y divide-border/40">
                          {rows.map((row) => (
                            <div key={row.key} className="flex items-center gap-3 px-3.5 py-2.5">
                              <span className="w-18 shrink-0 text-xs font-medium text-muted-foreground">
                                {row.label}
                              </span>
                              <div className="min-w-0 flex-1">{row.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
