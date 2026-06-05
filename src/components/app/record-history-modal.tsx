"use client";

import { useEffect, useState } from "react";
import { Clock, Eye, EyeOff, History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            {recordTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && history?.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No changes recorded yet.
            </p>
          )}

          {!loading && history && history.length > 0 && (
            <div className="space-y-3 py-1">
              {history.map((entry) => {
                const revealedSecret = revealedSecrets.get(entry.id);
                const isRevealingThis = revealingId === entry.id;

                // Collect rows to display — only fields with non-empty previous values
                const rows: React.ReactNode[] = [];

                for (const field of entry.updatedFields) {
                  if (field === "secretValue") {
                    if (!entry.prev.hasPrevSecret) continue;
                    rows.push(
                      <div key="secretValue" className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                          {FIELD_LABELS.secretValue}
                        </span>
                        {revealedSecret !== undefined ? (
                          <code className="flex-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs break-all">
                            {revealedSecret || "—"}
                          </code>
                        ) : (
                          <code className="flex-1 select-none text-xs tracking-[0.3em] text-muted-foreground">
                            ●●●●●●●●●●
                          </code>
                        )}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 shrink-0"
                            disabled={isRevealingThis}
                            onClick={() =>
                              revealedSecret !== undefined
                                ? handleHideSecret(entry.id)
                                : handleRevealSecret(entry.id)
                            }
                          >
                            {isRevealingThis ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : revealedSecret !== undefined ? (
                              <EyeOff className="size-3" />
                            ) : (
                              <Eye className="size-3" />
                            )}
                          </Button>
                        )}
                      </div>,
                    );
                    continue;
                  }

                  // Map updatedField key → prev object key
                  const prevKey = field as keyof typeof entry.prev;
                  const prevValue = entry.prev[prevKey];
                  if (!prevValue || prevValue === true) continue;

                  rows.push(
                    <div key={field} className="flex items-baseline gap-3">
                      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                        {FIELD_LABELS[field] ?? field}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">
                        {String(prevValue)}
                      </span>
                    </div>,
                  );
                }

                if (rows.length === 0) return null;

                return (
                  <div key={entry.id} className="rounded-[1rem] border border-border/60 bg-muted/30 p-4">
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{formatDate(entry.createdAt)}</span>
                      {entry.actorName && (
                        <>
                          <span>·</span>
                          <span>{entry.actorName}</span>
                        </>
                      )}
                    </div>
                    <div className="space-y-2">{rows}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
