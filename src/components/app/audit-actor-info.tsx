"use client";

import { useState } from "react";
import { Info } from "lucide-react";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export function AuditActorInfo({ firstName, lastName, email }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email || "System";

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium text-foreground">{name}</span>
      {email && (
        <>
          <button
            type="button"
            aria-label={showEmail ? "Hide email" : "Show email"}
            onClick={() => setShowEmail((v) => !v)}
            className="flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Info className="size-3.5" />
          </button>
          {showEmail && (
            <span className="font-mono text-xs text-muted-foreground">{email}</span>
          )}
        </>
      )}
    </span>
  );
}
