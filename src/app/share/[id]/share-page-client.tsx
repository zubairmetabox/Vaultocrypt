"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Clock,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Link2Off,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { verifySharePassword, revealSharedSecret, checkBundleStatus, type VerifyResult } from "@/lib/actions/sharing";
import { safeUrl } from "@/lib/utils";

type VerifiedRecord = Extract<VerifyResult, { ok: true }>["records"][number];

type RevealState = "hidden" | "loading" | "revealed";

type SharePageClientProps = { bundleId: string };

export function SharePageClient({ bundleId }: SharePageClientProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [accessGranted, setAccessGranted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [records, setRecords] = useState<VerifiedRecord[]>([]);

  const [revealStates, setRevealStates] = useState<Map<string, RevealState>>(new Map());
  const [revealedSecrets, setRevealedSecrets] = useState<Map<string, string>>(new Map());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Poll every 10 s once the user is past the password gate
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!accessGranted) return;
    intervalRef.current = setInterval(async () => {
      try {
        const { active } = await checkBundleStatus(bundleId);
        if (!active) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setExpired(true);
        }
      } catch {
        // Network blip — keep polling, don't evict
      }
    }, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [accessGranted, bundleId]);

  async function handleVerify() {
    if (!password.trim()) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const result = await verifySharePassword(bundleId, password.trim());
      if (!result.ok) {
        if (result.reason === "expired") {
          setExpired(true);
        } else if (result.reason === "locked") {
          setVerifyError("Too many failed attempts. This link is locked for 15 minutes.");
        } else {
          setVerifyError("Incorrect password. Please check and try again.");
        }
        return;
      }
      setProjectName(result.projectName);
      setExpiresAt(result.expiresAt);
      setRecords(result.records);
      setAccessGranted(true);
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReveal(record: VerifiedRecord) {
    const current = revealStates.get(record.id);
    if (current === "revealed") {
      // Toggle hide
      setRevealStates((prev) => {
        const next = new Map(prev);
        next.delete(record.id);
        return next;
      });
      return;
    }

    setRevealStates((prev) => new Map(prev).set(record.id, "loading"));
    try {
      const secret = await revealSharedSecret(bundleId, record.id, password);
      setRevealedSecrets((prev) => new Map(prev).set(record.id, secret));
      setRevealStates((prev) => new Map(prev).set(record.id, "revealed"));
    } catch {
      setRevealStates((prev) => {
        const next = new Map(prev);
        next.delete(record.id);
        return next;
      });
    }
  }

  async function handleCopy(record: VerifiedRecord) {
    let value = "";
    const revealed = revealedSecrets.get(record.id);
    if (revealed !== undefined) {
      value = revealed;
    } else {
      try {
        value = await revealSharedSecret(bundleId, record.id, password);
        setRevealedSecrets((prev) => new Map(prev).set(record.id, value));
        setRevealStates((prev) => new Map(prev).set(record.id, "revealed"));
      } catch {
        return;
      }
    }
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(record.id);
    setTimeout(() => setCopiedId((prev) => (prev === record.id ? null : prev)), 2000);
  }

  // ── Expiry warning text ───────────────────────────────────────────────────

  function expiryWarning(date: Date | null): string | null {
    if (!date) return null;
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return null;
    const minutes = Math.floor(ms / 60_000);
    const hours = Math.floor(ms / 3_600_000);
    const days = Math.floor(ms / 86_400_000);
    if (days >= 1) return `This link expires in ${days} day${days === 1 ? "" : "s"}.`;
    if (hours >= 1) return `This link expires in ${hours} hour${hours === 1 ? "" : "s"}.`;
    return `This link expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  // ── Expired screen ────────────────────────────────────────────────────────

  if (expired) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-muted">
            <Link2Off className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">This link has expired</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The person who shared this link can generate a new one if needed.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Password gate ─────────────────────────────────────────────────────────

  if (!accessGranted) {
    return (
      <Shell>
        <div className="mx-auto max-w-sm space-y-6 pt-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-muted">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Shared credentials</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the password you received to access these records.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              disabled={isVerifying}
              className="text-center font-mono tracking-widest"
            />
            {verifyError && (
              <div className="flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {verifyError}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={!password.trim() || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Access records"
              )}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Record list ───────────────────────────────────────────────────────────

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Shared from
            </p>
            <p className="text-lg font-semibold text-foreground">{projectName}</p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            Verified
          </Badge>
        </div>

        {expiryWarning(expiresAt) && (
          <div className="flex items-center gap-2.5 rounded-[1rem] border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-300">
            <Clock className="size-4 shrink-0 text-amber-400" />
            {expiryWarning(expiresAt)}
          </div>
        )}

        <div className="space-y-3">
          {records.map((record) => {
            const revealState = revealStates.get(record.id) ?? "hidden";
            const isRevealed = revealState === "revealed";
            const isLoading = revealState === "loading";
            const isNote = record.type === "SECURE_NOTE";
            const secret = revealedSecrets.get(record.id);
            const isCopied = copiedId === record.id;

            return (
              <div
                key={record.id}
                className={
                  isNote
                    ? "rounded-[1.5rem] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.96))] p-4"
                    : "rounded-[1.5rem] border border-border/70 bg-background/95 p-4"
                }
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
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

                    <div className="space-y-0.5">
                      {record.url && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">URL</span>
                          <a
                            href={safeUrl(record.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 truncate text-sm text-foreground hover:underline"
                          >
                            {record.serviceName || record.url}
                          </a>
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
                        </div>
                      )}
                    </div>

                    {isNote ? (
                      <div className="rounded-[1.2rem] border border-amber-200/10 bg-slate-950/18 px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/92">
                          {isRevealed
                            ? (secret || "Empty note")
                            : record.notes
                              ? record.notes.slice(0, 120) + (record.notes.length > 120 ? "…" : "")
                              : "Hidden note content"}
                        </p>
                      </div>
                    ) : record.hasSecret ? (
                      <code
                        className={`inline-block rounded-lg border border-border/50 bg-muted/60 px-2.5 py-1 text-xs ${
                          isRevealed ? "font-mono text-foreground" : "select-none tracking-[0.3em] text-muted-foreground"
                        }`}
                      >
                        {isRevealed ? (secret || "—") : "•".repeat(18)}
                      </code>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {record.hasSecret && (
                      <Button
                        size="sm"
                        variant={isRevealed ? "default" : "outline"}
                        onClick={() => handleReveal(record)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : isRevealed ? (
                          <>
                            <EyeOff className="size-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="size-4" />
                            Reveal
                          </>
                        )}
                      </Button>
                    )}

                    {record.hasSecret && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(record)}
                      >
                        {isCopied ? (
                          <>
                            <ClipboardCheck className="size-4 text-primary" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

// ── Minimal branded shell for the public page ──────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/40 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <ShieldCheck className="size-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Vaultocrypt</span>
          </div>
          <span className="text-xs text-muted-foreground">Secure share</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
