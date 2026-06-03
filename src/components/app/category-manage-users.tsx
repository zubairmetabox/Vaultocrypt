"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Trash2, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addUserToCategoryByEmail,
  getCategoryUsers,
  removeUserFromCategory,
  type CategoryUserRow,
} from "@/lib/actions/category-access";

type Props = {
  categoryId: string;
  categoryName: string;
};

export function CategoryManageUsers({ categoryId, categoryName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<CategoryUserRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isPendingLoad, startLoad] = useTransition();
  const [isPendingAdd, startAdd] = useTransition();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isPendingRemove, startRemove] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setAddError(null);
    setLoadError(null);
    startLoad(async () => {
      try {
        const fetched = await getCategoryUsers(categoryId);
        setUsers(fetched);
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch {
        setLoadError("Failed to load users.");
      }
    });
  }, [open, categoryId]);

  function handleAdd() {
    if (!email.trim() || isPendingAdd) return;
    setAddError(null);
    startAdd(async () => {
      try {
        await addUserToCategoryByEmail(categoryId, email.trim());
        setEmail("");
        const fetched = await getCategoryUsers(categoryId);
        setUsers(fetched);
        router.refresh();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Failed to add user.");
      }
    });
  }

  function handleRemove(userId: string) {
    setRemovingUserId(userId);
    startRemove(async () => {
      try {
        await removeUserFromCategory(categoryId, userId);
        setUsers((prev) => prev.filter((u) => u.userId !== userId));
        router.refresh();
      } catch {
        // keep list as-is on error
      } finally {
        setRemovingUserId(null);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Users className="size-3.5" />
        Manage users
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage users</DialogTitle>
            <DialogDescription>
              Users added here can access{" "}
              <span className="font-medium text-foreground">{categoryName}</span> and all its
              projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-2">
            {/* User list */}
            <div className="space-y-2">
              {isPendingLoad ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : loadError ? (
                <p className="text-sm text-destructive">{loadError}</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users assigned yet.</p>
              ) : (
                users.map((user) => {
                  const name =
                    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.email ||
                    "Unknown";
                  const isRemoving = removingUserId === user.userId && isPendingRemove;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-card/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        {user.email && (
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isRemoving}
                        onClick={() => handleRemove(user.userId)}
                      >
                        {isRemoving
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : <Trash2 className="size-3.5" />}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add by email */}
            <div className="space-y-2 rounded-[1.1rem] border border-dashed border-border/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Add user
              </p>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="email"
                  placeholder="email@example.com"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
