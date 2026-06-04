"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSharedBundle, type ExpiryOption } from "@/lib/actions/sharing";

type SelectedRecord = { id: string; title: string; type: "credential" | "secure_note" };

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedRecords: SelectedRecord[];
};

type Phase = "config" | "loading" | "success";

const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  never: "Never",
};

function useClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), timeoutMs);
  }

  return { copied, copy };
}

export function ShareModal({ open, onOpenChange, projectId, selectedRecords }: ShareModalProps) {
  const [phase, setPhase] = useState<Phase>("config");
  const [expiry, setExpiry] = useState<ExpiryOption>("7d");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [shareId, setShareId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const urlClip = useClipboard();
  const pwClip = useClipboard();

  useEffect(() => {
    if (open) {
      setPhase("config");
      setExpiry("7d");
      setError(null);
      setShareId("");
      setPassword("");
      setShowPassword(false);
    }
  }, [open]);

  function handleShare() {
    setError(null);
    startTransition(async () => {
      try {
        const { id, password: pw } = await createSharedBundle(
          projectId,
          selectedRecords.map((r) => r.id),
          expiry,
        );
        setShareId(id);
        setPassword(pw);
        setPhase("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create share link.");
      }
    });
  }

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";

  const canClose = phase !== "loading" && !isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (canClose) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase === "config" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="size-4" />
                Share records
              </DialogTitle>
              <DialogDescription>
                Generate a secure link and password. Recipients can view the selected records
                without a Vaultocrypt account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-2">
              {/* Selected records list */}
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

              {/* Expiry */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Link expires in</label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryOption)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EXPIRY_LABELS) as [ExpiryOption, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
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
                    Creating…
                  </>
                ) : (
                  <>
                    <Share2 className="size-4" />
                    Share
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
                Share link created
              </DialogTitle>
              <DialogDescription>
                Send both the link and the password to the recipient — they need both to access the
                records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-2">
              {/* URL row */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Share URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-[0.875rem] border border-border/70 bg-muted/50 px-3 py-2 text-xs text-foreground">
                    {shareUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => urlClip.copy(shareUrl)}
                  >
                    {urlClip.copied ? (
                      <ClipboardCheck className="size-4 text-primary" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Password row */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-[0.875rem] border border-border/70 bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
                    {showPassword ? password : "•".repeat(password.length)}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Reveal password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => pwClip.copy(password)}
                  >
                    {pwClip.copied ? (
                      <ClipboardCheck className="size-4 text-primary" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Expiry: <span className="font-medium text-foreground">{EXPIRY_LABELS[expiry]}</span>
                {" · "}
                The password is stored and can be retrieved from the Sharing page.
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
