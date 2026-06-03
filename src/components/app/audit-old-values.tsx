"use client";

import { useState, useTransition } from "react";
import { History, Loader2 } from "lucide-react";

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

export function AuditOldValues({ auditEventId }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AuditPrevValues | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setOpen(true);
    if (values) return; // already fetched
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Previous values</DialogTitle>
            <DialogDescription>
              Field values before this update was applied.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-2">
            {isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : values ? (
              <dl className="space-y-3 text-sm">
                {[
                  { label: "Title", value: values.title },
                  { label: "Type", value: values.type },
                  { label: "Service", value: values.serviceName },
                  { label: "URL", value: values.url },
                  { label: "Username", value: values.username },
                  { label: "Password / Secret", value: values.secret, sensitive: true },
                  { label: "Notes", value: values.notes },
                ]
                  .filter((f) => f.value !== null && f.value !== "")
                  .map((field) => (
                    <div key={field.label}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {field.label}
                      </dt>
                      <dd className={`mt-0.5 break-all font-mono text-xs text-foreground ${field.sensitive ? "select-all" : ""}`}>
                        {field.value}
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
