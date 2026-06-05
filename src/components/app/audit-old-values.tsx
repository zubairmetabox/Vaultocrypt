"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { revealAuditValues, type AuditPrevValues } from "@/lib/actions/records";

type Props = {
  auditEventId: string;
};

const FIELDS: { key: keyof AuditPrevValues; label: string; sensitive?: boolean }[] = [
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "serviceName", label: "Service" },
  { key: "url", label: "URL" },
  { key: "username", label: "Username" },
  { key: "secret", label: "Password", sensitive: true },
  { key: "notes", label: "Notes" },
];

export function AuditOldValues({ auditEventId }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AuditPrevValues | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  function handleOpen() {
    setOpen(true);
    setSecretVisible(false);
    if (values) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await revealAuditValues(auditEventId);
        setValues(result);
      } catch {
        setError("Failed to retrieve previous values.");
      }
    });
  }

  const visibleFields = FIELDS.filter((f) => values?.[f.key] !== null && values?.[f.key] !== "");

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={handleOpen}
      >
        <History className="size-3.5" />
        Old values
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[70vh] max-w-sm flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-muted">
                <History className="size-4 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-sm">Previous values</DialogTitle>
                <DialogDescription className="text-xs">
                  Field values before this update was applied.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isPending && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isPending && error && (
              <p className="px-5 py-6 text-sm text-destructive">{error}</p>
            )}

            {!isPending && values && (
              <div className="divide-y divide-border/40">
                {visibleFields.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No previous values recorded.
                  </p>
                ) : (
                  visibleFields.map((field) => {
                    const val = values[field.key];
                    return (
                      <div key={field.key} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-18 shrink-0 text-xs font-medium text-muted-foreground">
                          {field.label}
                        </span>
                        {field.sensitive ? (
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {secretVisible ? (
                              <code className="min-w-0 flex-1 break-all rounded-lg border border-border/50 bg-background px-2.5 py-1 font-mono text-xs text-foreground">
                                {val || "—"}
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
                              onClick={() => setSecretVisible((v) => !v)}
                            >
                              {secretVisible ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">
                            {String(val)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
