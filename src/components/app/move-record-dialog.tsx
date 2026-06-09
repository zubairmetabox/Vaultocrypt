"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Check,
  Folder,
  FolderKanban,
  KeyRound,
  Loader2,
} from "lucide-react";

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
import { emitLiveAuditEvent } from "@/lib/audit-client";
import type { CategoryWithProjects } from "@/lib/actions/categories";
import { moveRecord } from "@/lib/actions/records";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

type Step = "category" | "project";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recordIds: string[];
  recordTitles: string[];
  currentProjectId: string;
  categories: CategoryWithProjects[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveRecordDialog({
  open,
  onOpenChange,
  recordIds,
  recordTitles,
  currentProjectId,
  categories,
}: Props) {
  const isBulk = recordIds.length > 1;
  const recordTitle = isBulk ? `${recordIds.length} records` : (recordTitles[0] ?? "");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithProjects | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("category");
      setSelectedCategory(null);
      setSelectedProjectId(null);
      setPendingMove(false);
      setError(null);
    }
  }, [open]);

  // Close dialog once transition ends (page fully refreshed)
  useEffect(() => {
    if (!isPending && pendingMove) {
      onOpenChange(false);
      setPendingMove(false);
    }
  }, [isPending, pendingMove, onOpenChange]);

  function handleCategorySelect(cat: CategoryWithProjects) {
    setSelectedCategory(cat);
    setSelectedProjectId(null);
    setStep("project");
  }

  function handleMove() {
    if (!selectedProjectId || isPending) return;
    setError(null);
    setPendingMove(true);
    startTransition(async () => {
      try {
        await Promise.all(
          recordIds.map((id) => moveRecord(id, currentProjectId, selectedProjectId)),
        );
        emitLiveAuditEvent({ action: "RECORD_UPDATED", targetLabel: recordTitle });
        router.refresh();
      } catch {
        setPendingMove(false);
        setError("Failed to move record(s). Please try again.");
      }
    });
  }

  // Projects available to move to (exclude current project)
  const availableProjects = selectedCategory
    ? selectedCategory.projects.filter((p) => p.id !== currentProjectId)
    : [];

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Moving {recordTitle}</DialogTitle>
            <DialogDescription>
              Transferring to the selected project…
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Updating records…</p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Step 1: Choose category ────────────────────────────────────────────────

  if (step === "category") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {recordTitle}</DialogTitle>
            <DialogDescription>
              Choose a destination category then pick a project.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-2">
              {categories.filter((cat) => !cat.isPersonal).map((cat) => {
                const Icon = CATEGORY_ICONS[cat.slug] ?? Folder;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className="flex w-full items-center gap-3 rounded-[1.25rem] border border-border/70 bg-card/60 px-4 py-3 text-left text-sm text-muted-foreground transition-all duration-150 hover:border-border hover:bg-muted/60 hover:text-foreground"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 font-medium">{cat.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {cat.projects.length} project{cat.projects.length === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Step 2: Choose project ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{selectedCategory?.name}</DialogTitle>
          <DialogDescription>
            Select a project to move <span className="font-medium text-foreground">{recordTitle}</span> to.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {availableProjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No other projects in this category.
            </p>
          ) : (
            <div className="space-y-2">
              {availableProjects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
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
                      <KeyRound
                        className={cn(
                          "size-4",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{project.name}</p>
                      {project.contact && (
                        <p className="truncate text-xs text-muted-foreground">{project.contact}</p>
                      )}
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </DialogBody>

        {error && (
          <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setStep("category"); setSelectedProjectId(null); setError(null); }}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={handleMove} disabled={!selectedProjectId}>
            <ArrowRightLeft className="size-4" />
            Move record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
