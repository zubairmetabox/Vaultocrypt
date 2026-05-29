"use client";

import { useState, useTransition } from "react";
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
import { updateClient } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = "Active" | "Inactive";

type ClientDetailsCardProps = {
  clientId: string;
  initialName: string;
  initialContact: string;
  initialVertical: string;
  initialStatus: ClientStatus;
  currentCategoryId: string | null;
  categories: CategoryRow[];
};

type ClientDraft = {
  name: string;
  contact: string;
  vertical: string;
  status: ClientStatus;
};

const statuses: ClientStatus[] = ["Active", "Inactive"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

function statusBadgeVariant(status: ClientStatus) {
  if (status === "Inactive") return "secondary";
  return "outline";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientDetailsCard({
  clientId,
  initialName,
  initialContact,
  initialVertical,
  initialStatus,
  currentCategoryId,
  categories,
}: ClientDetailsCardProps) {
  const router = useRouter();
  const [isEditPending, startEditTransition] = useTransition();
  const [isMovePending, startMoveTransition] = useTransition();

  // Edit details state
  const [editOpen, setEditOpen] = useState(false);
  const [details, setDetails] = useState<ClientDraft>({
    name: initialName,
    contact: initialContact,
    vertical: initialVertical,
    status: initialStatus,
  });
  const [draft, setDraft] = useState<ClientDraft>(details);

  // Move category state
  const [moveOpen, setMoveOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(currentCategoryId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function handleEditOpenChange(nextOpen: boolean) {
    setEditOpen(nextOpen);
    if (nextOpen) setDraft(details);
  }

  function updateDraft<K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    startEditTransition(async () => {
      await updateClient(clientId, {
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
    setMoveOpen(nextOpen);
    if (nextOpen) setSelectedCategoryId(null);
  }

  function handleMove() {
    if (!selectedCategoryId || isMovePending) return;
    const newCatId = selectedCategoryId;
    // Optimistic: update local state + close dialog immediately
    setActiveCategoryId(newCatId);
    setMoveOpen(false);
    startMoveTransition(async () => {
      await updateClient(clientId, { categoryId: newCatId });
      router.refresh();
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
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm transition-all duration-150",
                            isSelected
                              ? "border-primary/50 bg-primary/8 text-foreground"
                              : "border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
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
                <Button variant="outline" onClick={() => setMoveOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMove}
                  disabled={!selectedCategoryId}
                >
                  Move client
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
                <DialogTitle>Edit client details</DialogTitle>
                <DialogDescription>
                  Update the visible client profile information for this workspace.
                </DialogDescription>
              </DialogHeader>

              <DialogBody>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Client name</Label>
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
