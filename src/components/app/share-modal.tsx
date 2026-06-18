"use client";

import { useEffect, useTransition, useState } from "react";
import {
  AlertCircle,
  Check,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  Send,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSharedBundle, type ExpiryOption } from "@/lib/actions/sharing";

type SelectedRecord = { id: string; title: string; type: "credential" | "secure_note" | "env_file" };

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedRecords: SelectedRecord[];
};

type Phase = "config" | "success";

const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  never: "Never",
};

export function ShareModal({ open, onOpenChange, projectId, selectedRecords }: ShareModalProps) {
  const [phase, setPhase] = useState<Phase>("config");
  const [expiry, setExpiry] = useState<ExpiryOption>("7d");
  const [clientEmail, setClientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sentToEmail, setSentToEmail] = useState("");

  useEffect(() => {
    if (open) {
      setPhase("config");
      setExpiry("7d");
      setClientEmail("");
      setError(null);
      setSentToEmail("");
    }
  }, [open]);

  function handleShare() {
    if (!clientEmail.trim()) {
      setError("Please enter the client's email address.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createSharedBundle(
          projectId,
          selectedRecords.map((r) => r.id),
          expiry,
          clientEmail.trim(),
        );
        setSentToEmail(clientEmail.trim());
        setPhase("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create share link.");
      }
    });
  }

  const canClose = !isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (canClose) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">

        {phase === "config" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="size-4" />
                Share records
              </DialogTitle>
              <DialogDescription>
                Enter the client's email — they'll receive a link and use a one-time code to access
                the selected records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-2">
              {/* Selected records */}
              <div className="rounded-[1.25rem] border border-border/70 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {selectedRecords.length} {selectedRecords.length === 1 ? "record" : "records"} included
                </p>
                <ul className="space-y-1.5">
                  {selectedRecords.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm text-foreground">
                      {r.type === "secure_note" ? (
                        <FileText className="size-3.5 shrink-0 text-amber-400" />
                      ) : (
                        <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{r.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Client email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleShare()}
                    disabled={isPending}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Link expires in</label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryOption)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EXPIRY_LABELS) as [ExpiryOption, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={isPending || selectedRecords.length === 0}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500" />
                Invitation sent
              </DialogTitle>
              <DialogDescription>
                An email with the access link has been sent to the client.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-2">
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-muted/30 px-4 py-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Sent to</p>
                  <p className="truncate text-sm font-medium text-foreground">{sentToEmail}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The client will receive a one-time code by email when they open the link.
                Link expires in{" "}
                <span className="font-medium text-foreground">{EXPIRY_LABELS[expiry]}</span>.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
