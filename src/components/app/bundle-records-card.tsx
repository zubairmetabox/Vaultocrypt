"use client";

import { useState } from "react";
import { ClipboardCheck, Copy, FileText, KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BundleDetail } from "@/lib/actions/sharing";

type Props = { bundle: BundleDetail };

export function BundleRecordsCard({ bundle }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copyFieldValue(key: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value; el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopiedField(key);
    setTimeout(() => setCopiedField((p) => (p === key ? null : p)), 1500);
  }

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader>
        <CardTitle>Shared records</CardTitle>
        <p className="text-sm text-muted-foreground">
          {bundle.recordTitles.length}{" "}
          {bundle.recordTitles.length === 1 ? "record" : "records"} included in this share link.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {bundle.sharedRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-dashed border-border/70 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Records no longer available</p>
            <p className="text-xs text-muted-foreground">
              The original records may have been deleted from the project.
            </p>
          </div>
        ) : (
          bundle.sharedRecords.map((record) => {
            const isNote = record.type === "SECURE_NOTE";
            return (
              <div
                key={record.id}
                className={
                  isNote
                    ? "rounded-[1.5rem] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.96))] p-4"
                    : "rounded-[1.5rem] border border-border/70 bg-background/95 p-4"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={
                      isNote
                        ? "flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-100"
                        : "flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted"
                    }
                  >
                    {isNote ? (
                      <FileText className="size-4" />
                    ) : (
                      <KeyRound className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-foreground">{record.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {isNote ? "note" : "credential"}
                  </Badge>
                </div>

                <div className="mt-2 space-y-0.5">
                  {record.url && (
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">URL</span>
                      <a
                        href={record.url.startsWith("http") ? record.url : `https://${record.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate text-sm text-foreground hover:underline"
                      >
                        {record.serviceName || record.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyFieldValue(`${record.id}:url`, record.url || "")}
                        title={copiedField === `${record.id}:url` ? "Copied" : "Copy"}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {copiedField === `${record.id}:url` ? (
                          <ClipboardCheck className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  {!record.url && record.serviceName && (
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Service</span>
                      <span className="text-sm text-foreground">{record.serviceName}</span>
                    </div>
                  )}
                  {record.username && (
                    <div className="flex items-baseline gap-2">
                      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Username</span>
                      <span className="min-w-0 truncate text-sm text-foreground">{record.username}</span>
                      <button
                        type="button"
                        onClick={() => copyFieldValue(`${record.id}:username`, record.username || "")}
                        title={copiedField === `${record.id}:username` ? "Copied" : "Copy"}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {copiedField === `${record.id}:username` ? (
                          <ClipboardCheck className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Secret</span>
                    <code className="select-none text-xs tracking-[0.3em] text-muted-foreground">
                      {"•".repeat(14)}
                    </code>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
