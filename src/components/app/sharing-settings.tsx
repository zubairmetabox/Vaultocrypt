"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSharingFromEmail } from "@/lib/actions/settings";

type Props = { initialEmail: string | null };

export function SharingSettings({ initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSharingFromEmail(email.trim() || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        setError("Failed to save. Make sure you have admin access.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Outbound share and OTP emails will be sent from this address. It must be a verified sender
        in your Resend account. Leave blank to disable email sending.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="noreply@yourdomain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            disabled={isPending}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSave} disabled={isPending} variant={saved ? "outline" : "default"}>
          {saved ? (
            <><Check className="size-4 text-emerald-500" />Saved</>
          ) : (
            "Save"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
