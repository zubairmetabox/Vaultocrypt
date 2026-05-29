"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Activity,
  Building2,
  ChevronDown,
  Folder,
  FolderKanban,
  Loader2,
  Plus,
  Settings2,
} from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
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
import { createCategory } from "@/lib/actions/categories";
import type { CategoryWithClients } from "@/lib/actions/categories";
import type { ClientRow } from "@/lib/actions/clients";
import { cn } from "@/lib/utils";

// Icon per slug — defaults to Folder for user-created categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

type SidebarProps = {
  pathname: string;
  categories: CategoryWithClients[];
};

export function Sidebar({ pathname, categories }: SidebarProps) {
  const router = useRouter();

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of categories) {
      const onCategoryPath = pathname === `/categories/${cat.id}`;
      const hasActiveClient = cat.clients.some((c) => pathname === `/clients/${c.id}`);
      initial[cat.id] = onCategoryPath || hasActiveClient;
    }
    return initial;
  });

  const [addOpen, setAddOpen] = useState(false);

  // Optimistic categories — cleared as soon as server data refreshes
  const [optimisticCats, setOptimisticCats] = useState<CategoryWithClients[]>([]);
  useEffect(() => {
    setOptimisticCats([]);
  }, [categories]);

  // Auto-open the relevant section when pathname changes
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      for (const cat of categories) {
        const onCategoryPath = pathname === `/categories/${cat.id}`;
        const hasActiveClient = cat.clients.some((c) => pathname === `/clients/${c.id}`);
        if (onCategoryPath || hasActiveClient) next[cat.id] = true;
      }
      return next;
    });
  }, [pathname, categories]);

  function toggle(catId: string) {
    setOpenMap((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  function handleOptimisticAdd(name: string) {
    const tempId = `__optimistic__${Date.now()}`;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tempCat: CategoryWithClients = {
      id: tempId,
      name: name.trim(),
      slug,
      isDefault: false,
      order: 999,
      clients: [],
    };
    setOptimisticCats((prev) => [...prev, tempCat]);
    setOpenMap((prev) => ({ ...prev, [tempId]: false }));
  }

  const allCats = [...categories, ...optimisticCats];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <BrandMark />

      <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-0.5">
        {/* ── Dynamic category sections ───────────────────────────────────── */}
        {allCats.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] ?? Folder;
          const isActive =
            pathname === `/categories/${cat.id}` ||
            cat.clients.some((c) => pathname === `/clients/${c.id}`);
          const isOpen = openMap[cat.id] ?? false;

          return (
            <CategorySection
              key={cat.id}
              cat={cat}
              icon={Icon}
              active={isActive}
              open={isOpen}
              pathname={pathname}
              onToggle={() => toggle(cat.id)}
              isOptimistic={cat.id.startsWith("__optimistic__")}
            />
          );
        })}

        {/* ── Add category ────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-[1.25rem] px-3 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add category
        </button>

        {/* ── Bottom nav ──────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-1 pt-2">
          {[
            { href: "/activity", label: "Activity", icon: Activity },
            { href: "/settings", label: "Settings", icon: Settings2 },
          ].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4 transition-transform duration-200 group-hover:scale-105" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AddCategoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onOptimisticAdd={handleOptimisticAdd}
        onRefresh={() => router.refresh()}
      />
    </aside>
  );
}

// ─── CategorySection ──────────────────────────────────────────────────────────

function CategorySection({
  cat,
  icon: Icon,
  active,
  open,
  pathname,
  onToggle,
  isOptimistic,
}: {
  cat: CategoryWithClients;
  icon: React.ElementType;
  active: boolean;
  open: boolean;
  pathname: string;
  onToggle: () => void;
  isOptimistic?: boolean;
}) {
  const rowClass = cn(
    "group flex w-full cursor-default items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
    isOptimistic
      ? "cursor-default text-muted-foreground opacity-60"
      : active
        ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );

  return (
    <div className="space-y-1.5">
      {/* Entire row toggles the section; icon+text also navigates */}
      <div className={rowClass} onClick={isOptimistic ? undefined : onToggle}>
        {isOptimistic ? (
          <>
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{cat.name}</span>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          </>
        ) : (
          <>
            {/* Icon + text: navigate only — no flex-1 so it stays content-width */}
            <Link
              href={`/categories/${cat.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-w-0 shrink items-center gap-3"
            >
              <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span className="truncate">{cat.name}</span>
            </Link>
            {/* Spacer: fills gap between text and chevron, click bubbles → toggle only */}
            <span className="flex-1 self-stretch" />
            {/* Chevron: click bubbles up to outer div → toggle only */}
            <ChevronDown
              className={cn(
                "size-4 shrink-0 cursor-pointer transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </>
        )}
      </div>

      {!isOptimistic && open && (
        <div className="rounded-[1.4rem] border border-border/70 bg-card/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="sidebar-client-scroll max-h-[18rem] space-y-0.5 overflow-y-auto pr-1">
            {cat.clients.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No clients yet</p>
            ) : (
              cat.clients.map((client) => (
                <ClientLink key={client.id} client={client} pathname={pathname} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ClientLink ───────────────────────────────────────────────────────────────

function ClientLink({ client, pathname }: { client: ClientRow; pathname: string }) {
  const active = pathname === `/clients/${client.id}`;
  return (
    <Link
      href={`/clients/${client.id}`}
      className={cn(
        "block rounded-[1rem] px-3 py-2 text-sm transition-all duration-200",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">{client.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{client.recordCount}</span>
      </div>
    </Link>
  );
}

// ─── AddCategoryDialog ────────────────────────────────────────────────────────

function AddCategoryDialog({
  open,
  onOpenChange,
  onOptimisticAdd,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOptimisticAdd: (name: string) => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleCreate() {
    if (!name.trim() || isPending) return;
    const trimmed = name.trim();
    // Optimistic: show immediately, close dialog, sync in background
    onOptimisticAdd(trimmed);
    onOpenChange(false);
    startTransition(async () => {
      await createCategory(trimmed);
      onRefresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Add a top-level category to organise your clients.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-2">
          <Input
            ref={inputRef}
            placeholder="e.g. Partners"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
