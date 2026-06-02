"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, StickyNote } from "lucide-react";

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
  type: "credential" | "secure_note";
  serviceName: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
};

export type RecordDraft = {
  title: string;
  type: "credential" | "secure_note";
  service: string;
  url: string;
  username: string;
  secretValue: string;
  notes: string;
};

type RecordFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a record to edit it; omit for create mode. */
  record?: RecordFormInput;
  onSave: (draft: RecordDraft) => void;
  /** Controls save button loading state — managed by the parent transition. */
  isPending?: boolean;
};

const EMPTY_DRAFT: RecordDraft = {
  title: "",
  type: "credential",
  service: "",
  url: "",
  username: "",
  secretValue: "",
  notes: "",
};

function toDraft(record: RecordFormInput): RecordDraft {
  return {
    title: record.title,
    type: record.type,
    service: record.serviceName ?? "",
    url: record.url ?? "",
    username: record.username ?? "",
    secretValue: "",
    notes: record.notes ?? "",
  };
}

export function RecordFormDialog({
  open,
  onOpenChange,
  record,
  onSave,
  isPending = false,
}: RecordFormDialogProps) {
  const isEdit = Boolean(record);
  const [draft, setDraft] = useState<RecordDraft>(() =>
    record ? toDraft(record) : EMPTY_DRAFT,
  );

  // Reset form every time the dialog opens (covers both create and edit)
  useEffect(() => {
    if (open) {
      setDraft(record ? toDraft(record) : EMPTY_DRAFT);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit record" : "Add record"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this vault record."
              : "Create a new credential or secure note for this client."}
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
                  <StickyNote className="size-4" />
                  Secure note
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
              <div className="grid gap-2">
                <Label>Service</Label>
                <Input
                  placeholder="e.g. Cloudflare"
                  value={draft.service}
                  onChange={(e) => set("service", e.target.value)}
                  disabled={isPending}
                />
              </div>
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

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{isCredential ? "Notes (optional)" : "Content"}</Label>
              <Textarea
                placeholder={
                  isCredential
                    ? "Any additional context for this credential…"
                    : "Paste your secure note content here…"
                }
                rows={isCredential ? 2 : 4}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={isPending}
              />
            </div>

          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!draft.title.trim() || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
