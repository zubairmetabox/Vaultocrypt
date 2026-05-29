"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Building2, Check, Folder, FolderKanban, Loader2, PencilLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryRow } from "@/lib/actions/categories";
import { updateProject } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "Active" | "Inactive";

type ProjectDetailsCardProps = {
  projectId: string;
  initialName: string;
  initialContact: string;
  initialVertical: string;
  initialStatus: ProjectStatus;
  currentCategoryId: string | null;
  categories: CategoryRow[];
};

type ProjectDraft = {
  name: string;
  contact: string;
  vertical: string;
  status: ProjectStatus;
};

const statuses: ProjectStatus[] = ["Active", "Inactive"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

function statusBadgeVariant(status: ProjectStatus) {
  if (status === "Inactive") return "secondary";
  return "outline";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectDetailsCard({
  projectId,
  initialName,
  initialContact,
  initialVertical,
  initialStatus,
  currentCategoryId,
  categories,
}: ProjectDetailsCardProps) {
  const router = useRouter();
  const [isEditPending, startEditTransition] = useTransition();
  const [isMovePending, startMoveTransition] = useTransition();

  // Edit details state
  const [editOpen, setEditOpen] = useState(false);
  const [details, setDetails] = useState<ProjectDraft>({
    name: initialName,
    contact: initialContact,
    vertical: initialVertical,
    status: initialStatus,
  });
  const [draft, setDraft] = useState<ProjectDraft>(details);

  // Move category state
  const [moveOpen, setMoveOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(currentCategoryId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  // Close modal + commit label only after the full transition (incl. router.refresh) settles
  useEffect(() => {
    if (!isMovePending && pendingCategoryId) {
      setActiveCategoryId(pendingCategoryId);
      setMoveOpen(false);
      setPendingCategoryId(null);
    }
  }, [isMovePending, pendingCategoryId]);

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen);
    if (nextOpen) setDraft(details);
  }

  function updateDraft<K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    startEditTransition(async () => {
      await updateProject(projectId, {
        name: draft.name,
        contact: draft.contact,
        vertical: draft.vertical,
        status: draft.status === "Active" ? "ACTIVE" : "INACTIVE",
      });
      setDetails(draft);
      setEditOpen(false);
      router.refresh();
    });
  }

  // ── Move handlers ──────────────────────────────────────────────────────────

  function handleMoveOpenChange(nextOpen: boolean) {
    if (isMovePending) return; // block Escape/overlay close while in flight
    setMoveOpen(nextOpen);
    if (nextOpen) setSelectedCategoryId(null);
  }

  function handleMove() {
    if (!selectedCategoryId || isMovePending) return;
    const newCatId = selectedCategoryId;
    // Record which category we're moving to — useEffect will apply it when transition ends
    setPendingCategoryId(newCatId);
    startMoveTransition(async () => {
      await updateProject(projectId, { categoryId: newCatId });
      router.refresh(); // keeps isPending=true until RSC re-render is committed
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const otherCategories = categories.filter((c) => c.id !== activeCategoryId);

  return (
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CardTitle>{details.name}</CardTitle>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {details.contact && <p>{details.contact}</p>}
            {details.vertical && <p>{details.vertical}</p>}
          </div>
          {activeCategory && (
            <p className="text-xs text-muted-foreground">
              Category:{" "}
              <span className="font-medium text-foreground">{activeCategory.name}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant(details.status)}>{details.status}</Badge>

          {/* ── Move category dialog ── */}
          <Dialog open={moveOpen} onOpenChange={handleMoveOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <ArrowRightLeft className="size-4" />
                Move
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Move to category</DialogTitle>
                <DialogDescription>
                  Select a category to move{" "}
                  <span className="font-medium text-foreground">{details.name}</span> to.
                </DialogDescription>
              </DialogHeader>

              <DialogBody>
                {otherCategories.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No other categories available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {otherCategories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.slug] ?? Folder;
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          disabled={isMovePending}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm transition-all duration-150",
                            isSelected
                              ? "border-primary/50 bg-primary/8 text-foreground"
                              : "border-border/70 bg-card/60 text-muted-foreground",
                            !isMovePending && !isSelected && "hover:border-border hover:bg-muted/60 hover:text-foreground",
                            isMovePending && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                              isSelected ? "bg-primary/15" : "bg-muted",
                            )}
                          >
                            <Icon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <span className="flex-1 font-medium">{cat.name}</span>
                          {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </DialogBody>

              <DialogFooter>
                <Button variant="outline" onClick={() => setMoveOpen(false)} disabled={isMovePending}>
                  Cancel
                </Button>
                <Button onClick={handleMove} disabled={!selectedCategoryId || isMovePending}>
                  {isMovePending && <Loader2 className="size-4 animate-spin" />}
                  Move project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Edit details dialog ── */}
          <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <PencilLine className="size-4" />
                Edit details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Edit project details</DialogTitle>
                <DialogDescription>
                  Update the visible project profile information for this workspace.
                </DialogDescription>
              </DialogHeader>

              <DialogBody>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Project name</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft("name", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Primary contact</Label>
                      <Input
                        value={draft.contact}
                        onChange={(e) => updateDraft("contact", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Vertical</Label>
                      <Input
                        value={draft.vertical}
                        onChange={(e) => updateDraft("vertical", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={draft.status === status ? "default" : "outline"}
                          onClick={() => updateDraft("status", status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isEditPending}>
                  {isEditPending && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}
