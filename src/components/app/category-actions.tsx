"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRole } from "@/contexts/role";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import { CategoryManageUsers } from "@/components/app/category-manage-users";

type Props = {
  categoryId: string;
  categoryName: string;
  isDefault: boolean;
  isPersonal: boolean;
  projectCount: number;
};

export function CategoryActions({ categoryId, categoryName, isDefault, isPersonal, projectCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const role = useRole();
  const canManageCategory = role === "ADMIN" || isPersonal;

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(categoryName);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editOpen) {
      setEditName(categoryName);
      setRenameError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editOpen, categoryName]);

  // Close only once the refreshed prop reflects the new name
  useEffect(() => {
    if (pendingName !== null && categoryName === pendingName) {
      setEditOpen(false);
      setPendingName(null);
    }
  }, [categoryName, pendingName]);

  function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === categoryName) { setEditOpen(false); return; }
    setRenameError(null);
    setPendingName(trimmed);
    startTransition(async () => {
      try {
        await updateCategory(categoryId, trimmed);
        router.refresh();
      } catch {
        setPendingName(null);
        setRenameError("Failed to rename category. Please try again.");
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteCategory(categoryId);
        router.push("/");
      } catch {
        setDeleteError("Failed to delete category. Please try again.");
      }
    });
  }

  if (!canManageCategory) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        {!isPersonal && <CategoryManageUsers categoryId={categoryId} categoryName={categoryName} />}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Rename
        </Button>

        {!isDefault && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* ── Rename dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!isPending) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              Enter a new name for <span className="font-medium text-foreground">{categoryName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              disabled={isPending}
            />
          </div>
          {renameError && (
            <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {renameError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={!editName.trim() || editName.trim() === categoryName || isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!isPending) setDeleteOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{categoryName}</span> will be permanently deleted.
              {projectCount > 0 && (
                <> Its{" "}
                  <span className="font-medium text-foreground">
                    {projectCount} project{projectCount === 1 ? "" : "s"}
                  </span>{" "}
                  will be moved to <span className="font-medium text-foreground">Clients</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteError(null); }} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
