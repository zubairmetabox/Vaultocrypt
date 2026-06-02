"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

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

type Props = {
  categoryId: string;
  categoryName: string;
  isDefault: boolean;
  projectCount: number;
};

export function CategoryActions({ categoryId, categoryName, isDefault, projectCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(categoryName);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editOpen) {
      setEditName(categoryName);
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
    setPendingName(trimmed);
    startTransition(async () => {
      await updateCategory(categoryId, trimmed);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCategory(categoryId);
      router.push("/");
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
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
