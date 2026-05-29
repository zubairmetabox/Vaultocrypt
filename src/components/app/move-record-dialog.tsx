"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
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
import type { CategoryWithClients } from "@/lib/actions/categories";
import { moveRecord } from "@/lib/actions/records";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

type Step = "category" | "client";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recordId: string;
  recordTitle: string;
  currentClientId: string;
  categories: CategoryWithClients[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveRecordDialog({
  open,
  onOpenChange,
  recordId,
  recordTitle,
  currentClientId,
  categories,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithClients | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("category");
      setSelectedCategory(null);
      setSelectedClientId(null);
      setPendingMove(false);
    }
  }, [open]);

  // Close dialog once transition ends (page fully refreshed)
  useEffect(() => {
    if (!isPending && pendingMove) {
      onOpenChange(false);
      setPendingMove(false);
    }
  }, [isPending, pendingMove, onOpenChange]);

  function handleCategorySelect(cat: CategoryWithClients) {
    setSelectedCategory(cat);
    setSelectedClientId(null);
    setStep("client");
  }

  function handleMove() {
    if (!selectedClientId || isPending) return;
    setPendingMove(true);
    startTransition(async () => {
      await moveRecord(recordId, currentClientId, selectedClientId);
      router.refresh();
    });
  }

  // Clients available to move to (exclude current client)
  const availableClients = selectedCategory
    ? selectedCategory.clients.filter((c) => c.id !== currentClientId)
    : [];

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Moving record</DialogTitle>
            <DialogDescription>
              Transferring{" "}
              <span className="font-medium text-foreground">{recordTitle}</span>…
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
            <DialogTitle>Move record</DialogTitle>
            <DialogDescription>
              Choose a category to move{" "}
              <span className="font-medium text-foreground">{recordTitle}</span> to.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-2">
              {categories.map((cat) => {
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
                      {cat.clients.length} client{cat.clients.length === 1 ? "" : "s"}
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

  // ── Step 2: Choose client ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{selectedCategory?.name}</DialogTitle>
          <DialogDescription>
            Select a client to move{" "}
            <span className="font-medium text-foreground">{recordTitle}</span> to.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {availableClients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No other clients in this category.
            </p>
          ) : (
            <div className="space-y-2">
              {availableClients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
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
                      <p className="truncate font-medium">{client.name}</p>
                      {client.contact && (
                        <p className="truncate text-xs text-muted-foreground">{client.contact}</p>
                      )}
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => { setStep("category"); setSelectedClientId(null); }}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={handleMove} disabled={!selectedClientId}>
            <ArrowRightLeft className="size-4" />
            Move record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
