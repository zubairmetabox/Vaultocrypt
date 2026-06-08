"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSystemLogs, type SystemLogRow } from "@/lib/actions/settings";

type Props = { initialLogs: SystemLogRow[] };

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

function LogRow({ log }: { log: SystemLogRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div className="rounded-[1rem] border border-destructive/20 bg-destructive/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 font-mono text-xs text-destructive">
              {log.source}
            </span>
            <p className="text-sm text-foreground/90">{log.message}</p>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
        </div>
        {hasMetadata && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded
              ? <ChevronUp className="size-4" />
              : <ChevronDown className="size-4" />}
          </button>
        )}
      </div>

      {expanded && hasMetadata && (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-2.5 font-mono text-xs text-muted-foreground">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function SystemLogs({ initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const fresh = await getSystemLogs(100);
      setLogs(fresh);
    } catch { /* silent */ } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Errors from email delivery and other background operations.
          {logs.length === 0 ? " No errors recorded." : ` ${logs.length} error${logs.length === 1 ? "" : "s"} recorded.`}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shrink-0"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-[1rem] border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 shrink-0 text-emerald-500" />
          All systems operating normally.
        </div>
      ) : (
        <div className="app-scrollbar max-h-96 space-y-2 overflow-y-auto pr-1">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
