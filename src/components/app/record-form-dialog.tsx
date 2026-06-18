"use client";

import { useEffect, useState } from "react";
import { FileText, KeyRound, Loader2 } from "lucide-react";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export type RecordFormInput = {
  title: string;
  type: "credential" | "secure_note" | "env_file";
  serviceName: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
  hasEncryptedContent?: boolean;
  uploadedBy?: string | null;
};

export type RecordDraft = {
  title: string;
  type: "credential" | "secure_note";
  service: string;
  url: string;
  username: string;
  secretValue: string;
  notes: string;
  encryptNote: boolean;
};

type RecordFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a record to edit it; omit for create mode. */
  record?: RecordFormInput;
  defaultType?: RecordDraft["type"];
  onSave: (draft: RecordDraft) => void;
  /** Controls save button loading state — managed by the parent transition. */
  isPending?: boolean;
  /** Inline error message from the parent after a failed server action. */
  error?: string | null;
};

const EMPTY_DRAFT: RecordDraft = {
  title: "",
  type: "credential",
  service: "",
  url: "",
  username: "",
  secretValue: "",
  notes: "",
  encryptNote: true,
};

function toDraft(record: RecordFormInput): RecordDraft {
  return {
    title: record.title,
    type: record.type === "secure_note" ? "secure_note" : "credential",
    service: record.serviceName ?? "",
    url: record.url ?? "",
    username: record.username ?? "",
    secretValue: "",
    notes: record.notes ?? "",
    encryptNote: record.hasEncryptedContent ?? record.type === "secure_note",
  };
}

function emptyDraft(type: RecordDraft["type"]): RecordDraft {
  return { ...EMPTY_DRAFT, type };
}

export function RecordFormDialog({
  open,
  onOpenChange,
  record,
  defaultType = "credential",
  onSave,
  isPending = false,
  error,
}: RecordFormDialogProps) {
  const isEdit = Boolean(record);
  const [draft, setDraft] = useState<RecordDraft>(() =>
    record ? toDraft(record) : emptyDraft(defaultType),
  );

  // Reset form every time the dialog opens (covers both create and edit)
  useEffect(() => {
    if (open) {
      setDraft(record ? toDraft(record) : emptyDraft(defaultType));
    }
  }, [defaultType, open, record]);

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return; // block close while saving
    onOpenChange(nextOpen);
  }

  function set<K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!draft.title.trim() || isPending) return;
    // Don't close here — parent closes after the async resolves
    onSave(draft);
  }

  const isCredential = draft.type === "credential";
  const createLabel = isCredential ? "Add credential" : "Add note";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit record" : createLabel}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this vault record."
              : isCredential
                ? "Create a new credential for this project."
                : "Capture a secure note for this project."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-4">
            {/* Type picker */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={0}
                className="w-full"
                value={draft.type}
                onValueChange={(v) => v && set("type", v as RecordDraft["type"])}
                disabled={isPending}
              >
                <ToggleGroupItem value="credential" className="flex-1 gap-2">
                  <KeyRound className="size-4" />
                  Credential
                </ToggleGroupItem>
                <ToggleGroupItem value="secure_note" className="flex-1 gap-2">
                  <FileText className="size-4" />
                  Note
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                placeholder={isCredential ? "e.g. Cloudflare Production" : "e.g. API Access Notes"}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Service + URL */}
            <div className="grid gap-4 sm:grid-cols-2">
              {isCredential && (
                <div className="grid gap-2">
                  <Label>Service</Label>
                  <Input
                    placeholder="e.g. Cloudflare"
                    value={draft.service}
                    onChange={(e) => set("service", e.target.value)}
                    disabled={isPending}
                  />
                </div>
              )}
              {isCredential && (
                <div className="grid gap-2">
                  <Label>URL</Label>
                  <Input
                    placeholder="https://..."
                    value={draft.url}
                    onChange={(e) => set("url", e.target.value)}
                    disabled={isPending}
                  />
                </div>
              )}
            </div>

            {/* Username + Secret (credentials only) */}
            {isCredential && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="user@example.com"
                    value={draft.username}
                    onChange={(e) => set("username", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Password / Secret</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={draft.secretValue}
                    onChange={(e) => set("secretValue", e.target.value)}
                    autoComplete="new-password"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {!isCredential && (
              <label className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/60 bg-card/60 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Encrypt note</p>
                  <p className="text-xs text-muted-foreground">
                    Store the full note body encrypted. This is on by default.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={draft.encryptNote}
                  onChange={(e) => set("encryptNote", e.target.checked)}
                  disabled={isPending}
                  className="size-4 accent-primary"
                />
              </label>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{isCredential ? "Notes (optional)" : "Content"}</Label>
              <Textarea
                placeholder={
                  isCredential
                    ? "Any additional context for this credential…"
                    : draft.encryptNote
                      ? "Write the note content that should be stored encrypted…"
                      : "Write this like a Keep note: quick ideas, snippets, reminders, or handoff details…"
                }
                rows={isCredential ? 2 : 7}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={isPending}
              />
            </div>

          </div>
        </DialogBody>

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
          <Button onClick={handleSave} disabled={!draft.title.trim() || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : createLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
