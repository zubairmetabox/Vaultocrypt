"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useClientTitle } from "@/contexts/client-title";
import {
  AlertCircle,
  ClipboardCheck,
  Copy,
  Loader2,
  ShieldOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { expireSharedBundle, type BundleDetail } from "@/lib/actions/sharing";

type Props = { bundle: BundleDetail };

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

function isActive(bundle: BundleDetail): boolean {
  if (bundle.expiredManually) return false;
  if (bundle.expiresAt && new Date(bundle.expiresAt) < new Date()) return false;
  return true;
}

function formatDate(date: Date): string {
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

function expiryLabel(bundle: BundleDetail): string {
  if (bundle.expiredManually) return "Expired manually";
  if (!bundle.expiresAt) return "Never expires";
  const d = new Date(bundle.expiresAt);
  if (d < new Date()) return `Expired ${formatDate(d)}`;
  return `Expires ${formatDate(d)}`;
}

export function BundleDetailsCard({ bundle }: Props) {
  const router = useRouter();
  const [confirmExpire, setConfirmExpire] = useState(false);
  const [isExpiring, startExpire] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const active = isActive(bundle);
  const { setTitle } = useClientTitle();
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(`${window.location.origin}/share/${bundle.id}`);
  }, [bundle.id]);

  useEffect(() => {
    setTitle(bundle.projectName);
    return () => setTitle(null);
  }, [bundle.projectName, setTitle]);

  const urlClip = useClipboard();

  function handleExpire() {
    setError(null);
    startExpire(async () => {
      try {
        await expireSharedBundle(bundle.id);
        setConfirmExpire(false);
        router.refresh();
      } catch {
        setError("Failed to expire the link. Please try again.");
      }
    });
  }

  return (
    <>
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{bundle.projectName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(bundle.createdAt)} by {bundle.createdByName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "Active" : "Expired"}
            </Badge>
            {active && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmExpire(true)}
              >
                <ShieldOff className="size-4" />
                Expire now
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Expiry line */}
          <p className="text-sm text-muted-foreground">{expiryLabel(bundle)}</p>

          {/* Share URL */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Share URL</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[0.875rem] border border-border/70 bg-muted/50 px-3 py-2 text-xs text-foreground">
                {shareUrl}
              </code>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => urlClip.copy(shareUrl)}>
                {urlClip.copied ? <ClipboardCheck className="size-4 text-primary" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmExpire} onOpenChange={(o) => { if (!isExpiring) setConfirmExpire(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Expire this link?</DialogTitle>
            <DialogDescription>
              Anyone with the URL and password will immediately lose access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExpire(false)} disabled={isExpiring}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExpire} disabled={isExpiring}>
              {isExpiring && <Loader2 className="size-4 animate-spin" />}
              Expire now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
