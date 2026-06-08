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

type CurrentValues = {
  title: string;
  serviceName: string | null;
  url: string | null;
  username: string | null;
};

type Props = {
  recordId: string;
  recordTitle: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValues: CurrentValues;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  serviceName: "Service",
  url: "URL",
  username: "Username",
};

const TRACKED_FIELDS = ["title", "serviceName", "url", "username"] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

type SnapshotState = Record<TrackedField, string | null>;

type Snapshot = {
  state: SnapshotState;
  highlightedFields: Set<string>;
  isActive: boolean;
  entry: RecordHistoryEntry | null;
};

function buildSnapshots(
  history: RecordHistoryEntry[],
  currentValues: CurrentValues,
): Snapshot[] {
  let state: SnapshotState = {
    title: currentValues.title,
    serviceName: currentValues.serviceName,
    url: currentValues.url,
    username: currentValues.username,
  };

  const states: SnapshotState[] = [{ ...state }];

  for (const entry of history) {
    const next = { ...state };
    for (const field of entry.updatedFields) {
      if ((TRACKED_FIELDS as readonly string[]).includes(field)) {
        const prevRecord = entry.prev as unknown as Record<string, string | null>;
        (next as Record<string, string | null>)[field] = prevRecord[field] ?? null;
      }
    }
    states.push({ ...next });
    state = next;
  }

  return states.map((s, i) => {
    // Highlight only fields whose value actually differs from the adjacent newer snapshot
    const newerState = i === 0 ? null : states[i - 1];
    const highlightedFields = new Set<string>();
    if (newerState) {
      for (const field of TRACKED_FIELDS) {
        if ((s[field] ?? null) !== (newerState[field] ?? null)) {
          highlightedFields.add(field);
        }
      }
    }
    // For the active card, highlight the same fields as the snapshot below it
    const activeHighlight = i === 0 && states[1]
      ? (() => {
          const set = new Set<string>();
          for (const field of TRACKED_FIELDS) {
            if ((s[field] ?? null) !== (states[1][field] ?? null)) set.add(field);
          }
          return set;
        })()
      : new Set<string>();

    return {
      state: s,
      isActive: i === 0,
      highlightedFields: i === 0 ? activeHighlight : highlightedFields,
      entry: i === 0 ? null : history[i - 1],
    };
  });
}

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

function SnapshotCard({
  snapshot,
  isAdmin,
  revealedSecret,
  isRevealing,
  onReveal,
  onHide,
}: {
  snapshot: Snapshot;
  isAdmin: boolean;
  revealedSecret: string | undefined;
  isRevealing: boolean;
  onReveal: () => void;
  onHide: () => void;
}) {
  const { state, isActive, highlightedFields, entry } = snapshot;

  // Only show fields that have a value in at least this snapshot
  const visibleFields = TRACKED_FIELDS.filter((f) => state[f]);

  return (
    <div
      className={`flex-1 overflow-hidden rounded-[1rem] border ${
        isActive
          ? "border-primary/50 bg-primary/5"
          : "border-border/60 bg-card/80"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${
          isActive ? "border-primary/20" : "border-border/40"
        }`}
      >
        {isActive ? (
          <span className="text-xs font-semibold text-primary">Current</span>
        ) : (
          <span className="text-xs font-medium text-foreground/80">
            {entry ? formatDate(entry.createdAt) : ""}
          </span>
        )}
        {entry?.actorName && (
          <span className="truncate text-xs text-muted-foreground">
            {entry.actorName}
          </span>
        )}
      </div>

      {/* Field rows */}
      <div className="divide-y divide-border/40">
        {visibleFields.map((field) => {
          const isChanged = highlightedFields.has(field);
          const value = state[field];

          return (
            <div
              key={field}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${
                isChanged
                  ? isActive
                    ? "bg-emerald-500/10"
                    : "bg-amber-500/10"
                  : ""
              }`}
            >
              <span
                className={`w-18 shrink-0 text-xs font-medium ${
                  isChanged
                    ? isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {FIELD_LABELS[field]}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  isChanged
                    ? isActive
                      ? "font-medium text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                    : "text-foreground/90"
                }`}
              >
                {value ?? "—"}
              </span>
            </div>
          );
        })}

        {/* Password row — only shown for old entries if there was a secret change */}
        {!isActive && entry && entry.updatedFields.includes("secretValue") && entry.prev.hasPrevSecret && isAdmin && (
          <div
            className={`flex items-center gap-3 px-3.5 py-2.5 ${
              highlightedFields.has("secretValue") ? "bg-amber-500/10" : ""
            }`}
          >
            <span
              className={`w-18 shrink-0 text-xs font-medium ${
                highlightedFields.has("secretValue")
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              Password
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {revealedSecret !== undefined ? (
                <code className="min-w-0 flex-1 break-all rounded-lg border border-border/50 bg-background px-2.5 py-1 font-mono text-xs text-foreground">
                  {revealedSecret || "—"}
                </code>
              ) : (
                <code className="min-w-0 flex-1 select-none rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs tracking-[0.28em] text-muted-foreground">
                  ●●●●●●●●●●●
                </code>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                disabled={isRevealing}
                onClick={revealedSecret !== undefined ? onHide : onReveal}
              >
                {isRevealing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : revealedSecret !== undefined ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RecordHistoryModal({
  recordId,
  recordTitle,
  isAdmin,
  open,
  onOpenChange,
  currentValues,
}: Props) {
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

  const snapshots = history && history.length > 0
    ? buildSnapshots(history, currentValues)
    : null;

  const entryCount = history?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-muted">
              <History className="size-4 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-base">{recordTitle}</DialogTitle>
              <DialogDescription className="text-xs">
                {loading
                  ? "Loading…"
                  : entryCount === 0
                  ? "No changes yet"
                  : `${entryCount} change${entryCount === 1 ? "" : "s"}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
              <p className="text-xs text-muted-foreground/60">
                Edit this record to start building history.
              </p>
            </div>
          )}

          {!loading && snapshots && (
            <div className="relative px-6 py-4">
              {/* Timeline spine */}
              <div className="absolute left-[2.35rem] top-6 bottom-6 w-px bg-border/50" />

              <div className="space-y-6">
                {snapshots.map((snapshot, idx) => (
                  <div key={idx} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                      <div
                        className={`size-2 rounded-full ${
                          snapshot.isActive ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                    </div>

                    <SnapshotCard
                      snapshot={snapshot}
                      isAdmin={isAdmin}
                      revealedSecret={
                        snapshot.entry ? revealedSecrets.get(snapshot.entry.id) : undefined
                      }
                      isRevealing={snapshot.entry ? revealingId === snapshot.entry.id : false}
                      onReveal={() => snapshot.entry && handleRevealSecret(snapshot.entry.id)}
                      onHide={() => snapshot.entry && handleHideSecret(snapshot.entry.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
