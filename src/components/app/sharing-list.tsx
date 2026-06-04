"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SharedBundleRow } from "@/lib/actions/sharing";

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

function expiryLabel(bundle: SharedBundleRow): string {
  if (bundle.expiredManually) return "Expired manually";
  if (!bundle.expiresAt) return "Never expires";
  const d = new Date(bundle.expiresAt);
  if (d < new Date()) return `Expired ${formatDate(d)}`;
  return `Expires ${formatDate(d)}`;
}

export function SharingList({ initialBundles }: SharingListProps) {
  const activeBundles = initialBundles.filter(isActive);
  const expiredBundles = initialBundles.filter((b) => !isActive(b));

  if (initialBundles.length === 0) {
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
              <BundleRow key={b.id} bundle={b} active />
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
              <BundleRow key={b.id} bundle={b} active={false} />
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

function BundleRow({ bundle, active }: { bundle: SharedBundleRow; active: boolean }) {
  return (
    <Link
      href={`/sharing/${bundle.id}`}
      className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-border/60 bg-background/80 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-md"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{bundle.projectName}</p>
          <Badge variant={active ? "default" : "secondary"} className="text-xs">
            {active ? "Active" : "Expired"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {bundle.recordTitles.length}{" "}
          {bundle.recordTitles.length === 1 ? "record" : "records"}
          {" · "}
          {expiryLabel(bundle)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {bundle.recordTitles.slice(0, 3).join(", ")}
          {bundle.recordTitles.length > 3 ? ` +${bundle.recordTitles.length - 3} more` : ""}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(bundle.createdAt)}</span>
    </Link>
  );
}
