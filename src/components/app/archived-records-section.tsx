"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
import { restoreRecord, permanentlyDeleteRecord, type ArchivedRecordRow } from "@/lib/actions/records";

type Props = {
  projectId: string;
  initialRecords: ArchivedRecordRow[];
  isAdmin: boolean;
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

export function ArchivedRecordsSection({ projectId, initialRecords, isAdmin }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState(initialRecords);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ArchivedRecordRow | null>(null);
  const [isRestoring, startRestore] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  if (records.length === 0) return null;

  function handleRestore(record: ArchivedRecordRow) {
    setError(null);
    startRestore(async () => {
      try {
        await restoreRecord(record.id, projectId);
        setRecords((prev) => prev.filter((r) => r.id !== record.id));
        router.refresh();
      } catch {
        setError("Failed to restore record. Please try again.");
      }
    });
  }

  function handlePermanentDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setError(null);
    startDelete(async () => {
      try {
        await permanentlyDeleteRecord(target.id, projectId);
        setRecords((prev) => prev.filter((r) => r.id !== target.id));
        setConfirmDelete(null);
        router.refresh();
      } catch {
        setError("Failed to delete record. Please try again.");
      }
    });
  }

  return (
    <>
      <Card className="border-border/70 bg-card/95">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Archived records
              </CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {records.length}
              </span>
            </div>
          </div>
        </CardHeader>

        {open && (
          <CardContent className="pt-0">
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="divide-y divide-border/50">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground/80">{record.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.serviceName ?? record.username ?? record.type.toLowerCase().replace("_", " ")}
                      {" · "}Archived {formatDate(record.archivedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(record)}
                      disabled={isRestoring || isDeleting}
                    >
                      {isRestoring ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArchiveRestore className="size-3.5" />
                      )}
                      Restore
                    </Button>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDelete(record)}
                        disabled={isRestoring || isDeleting}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!isDeleting) setConfirmDelete(o ? confirmDelete : null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Permanently delete record?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{confirmDelete?.title}</span> will be
              permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
