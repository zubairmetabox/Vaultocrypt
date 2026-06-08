"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSharingConfig } from "@/lib/actions/settings";

type Props = {
  initialEmail: string | null;
  initialName: string | null;
};

export function SharingSettings({ initialEmail, initialName }: Props) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSharingConfig(email.trim() || null, name.trim() || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch {
        setError("Failed to save. Make sure you have admin access.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        Configure the sender details for outbound share and OTP emails.
        The address must be verified in your Resend account.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Sender name */}
        <div className="space-y-1.5">
          <Label className="text-sm">Sender name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="MetaBox Technology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              disabled={isPending}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">Appears as the "From" name in clients' inboxes.</p>
        </div>

        {/* From email */}
        <div className="space-y-1.5">
          <Label className="text-sm">From email</Label>
          <div className="relative">
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
          <p className="text-xs text-muted-foreground">Must be a verified sender in Resend.</p>
        </div>
      </div>

      {email && (
        <p className="rounded-[0.875rem] border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
          {name.trim() ? `${name.trim()} <${email.trim()}>` : email.trim()}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} variant={saved ? "outline" : "default"}>
          {saved ? (
            <><Check className="size-4 text-emerald-500" />Saved</>
          ) : (
            "Save"
          )}
        </Button>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
