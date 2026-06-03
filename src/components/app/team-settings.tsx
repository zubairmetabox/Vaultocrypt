"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAdmin, removeAdmin, type AdminRow } from "@/lib/actions/users";

type Props = {
  admins: AdminRow[];
};

export function TeamSettings({ admins }: Props) {
  const router = useRouter();
  const [isPendingAdd, startAdd] = useTransition();
  const [isPendingRemove, startRemove] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!email.trim() || isPendingAdd) return;
    setAddError(null);
    startAdd(async () => {
      try {
        await addAdmin(email.trim());
        setEmail("");
        router.refresh();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Failed to add admin.");
      }
    });
  }

  function handleRemove(userId: string) {
    setRemovingId(userId);
    startRemove(async () => {
      try {
        await removeAdmin(userId);
        router.refresh();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Failed to remove admin.");
      } finally {
        setRemovingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Admin list */}
      <div className="space-y-2">
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No admins yet.</p>
        ) : (
          admins.map((admin) => {
            const hasName = Boolean(admin.firstName || admin.lastName);
            const name = hasName
              ? [admin.firstName, admin.lastName].filter(Boolean).join(" ")
              : (admin.email ?? "Unknown");
            const isRemoving = removingId === admin.id && isPendingRemove;

            return (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-card/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {name}
                    {admin.isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  {hasName && admin.email && (
                    <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-xs">Admin</Badge>
                  {!admin.isSelf && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isRemoving}
                      onClick={() => handleRemove(admin.id)}
                    >
                      {isRemoving
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add admin */}
      <div className="space-y-2 rounded-[1.25rem] border border-dashed border-border/70 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Add admin
        </p>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="email"
            placeholder="email@metabox.mu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={isPendingAdd}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!email.trim() || isPendingAdd}>
            {isPendingAdd
              ? <Loader2 className="size-4 animate-spin" />
              : <UserPlus className="size-4" />}
          </Button>
        </div>
        {addError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {addError}
          </div>
        )}
      </div>
    </div>
  );
}
