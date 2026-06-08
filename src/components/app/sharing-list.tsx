"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, ExternalLink, Mail, Share2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { expireSharedBundle, type SharedBundleRow } from "@/lib/actions/sharing";

type SharingListProps = {
  initialBundles: SharedBundleRow[];
  role: string;
};

function isActive(bundle: SharedBundleRow): boolean {
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

function timeLeft(expiresAt: Date | null): string {
  if (!expiresAt) return "Never expires";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function expiryLabel(bundle: SharedBundleRow): string {
  if (bundle.expiredManually) return "Expired manually";
  if (!bundle.expiresAt) return "Never expires";
  const d = new Date(bundle.expiresAt);
  if (d < new Date()) return `Expired ${formatDate(d)}`;
  return `Expires ${formatDate(d)}`;
}

export function SharingList({ initialBundles }: SharingListProps) {
  const [bundles, setBundles] = useState(initialBundles);

  function handleExpired(id: string) {
    setBundles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, expiredManually: true } : b)),
    );
  }

  const activeBundles = bundles.filter(isActive);
  const expiredBundles = bundles.filter((b) => !isActive(b));

  if (bundles.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
            <Share2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No share links yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Select records on any project page and click Share to create one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {activeBundles.length > 0 && (
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active{" "}
              <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-normal text-emerald-500">
                {activeBundles.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeBundles.map((b) => (
              <BundleRow key={b.id} bundle={b} active onExpired={handleExpired} />
            ))}
          </CardContent>
        </Card>
      )}

      {expiredBundles.length > 0 && (
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired{" "}
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
                {expiredBundles.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredBundles.map((b) => (
              <BundleRow key={b.id} bundle={b} active={false} onExpired={handleExpired} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-[1rem] bg-muted">
        <Share2 className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Sharing</h1>
        <p className="text-sm text-muted-foreground">
          Manage shared credential links and their access history.
        </p>
      </div>
    </div>
  );
}

function BundleRow({
  bundle,
  active,
  onExpired,
}: {
  bundle: SharedBundleRow;
  active: boolean;
  onExpired: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleExpire(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await expireSharedBundle(bundle.id);
        onExpired(bundle.id);
      } catch { /* silent */ }
    });
  }

  const recordSummary = [
    bundle.recordTitles.slice(0, 3).join(", "),
    bundle.recordTitles.length > 3 ? `+${bundle.recordTitles.length - 3} more` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4 transition-all duration-150 hover:bg-muted/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        {/* ── Left: identity + meta ──────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Project + badge */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{bundle.projectName}</p>
            <Badge variant={active ? "default" : "secondary"} className="text-xs">
              {active ? "Active" : "Expired"}
            </Badge>
          </div>

          {/* Client email */}
          {bundle.clientEmail && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{bundle.clientEmail}</span>
            </div>
          )}

          {/* Record list */}
          <p className="text-xs text-muted-foreground">
            {bundle.recordTitles.length}{" "}
            {bundle.recordTitles.length === 1 ? "record" : "records"}
            {recordSummary ? ` · ${recordSummary}` : ""}
          </p>
        </div>

        {/* ── Right: time + actions ──────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {/* Time left / expiry */}
          <div className="flex items-center gap-1.5">
            <Clock className="size-3 shrink-0 text-muted-foreground" />
            <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {active ? timeLeft(bundle.expiresAt) : expiryLabel(bundle)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {active && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                onClick={handleExpire}
                disabled={isPending}
              >
                <XCircle className="size-3.5" />
                Expire now
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" asChild>
              <Link href={`/sharing/${bundle.id}`}>
                <ExternalLink className="size-3.5" />
                View
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Created date */}
      <p className="mt-2.5 text-xs text-muted-foreground/60">{formatDate(bundle.createdAt)}</p>
    </div>
  );
}
