"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronDown,
  Folder,
  FolderKanban,
  Lock,
  Loader2,
  Plus,
  Settings2,
  Share2,
} from "lucide-react";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useRole } from "@/contexts/role";

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
import type { CategoryWithProjects } from "@/lib/actions/categories";
import type { ProjectRow } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

// Icon per slug — defaults to Folder for user-created categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

type SidebarProps = {
  pathname: string;
  categories: CategoryWithProjects[];
  pendingCategoryIds?: string[];
  clerkEnabled?: boolean;
};

export function Sidebar({ pathname, categories, pendingCategoryIds = [], clerkEnabled = false }: SidebarProps) {
  const router = useRouter();
  const role = useRole();

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of categories) {
      const onCategoryPath = pathname === `/categories/${cat.id}`;
      const hasActiveProject = cat.projects.some((p) => pathname === `/projects/${p.id}`);
      initial[cat.id] = onCategoryPath || hasActiveProject;
    }
    return initial;
  });

  const [addOpen, setAddOpen] = useState(false);

  // Optimistic categories — cleared as soon as server data refreshes
  const [optimisticCats, setOptimisticCats] = useState<CategoryWithProjects[]>([]);
  useEffect(() => {
    setOptimisticCats([]);
  }, [categories]);

  // Auto-open the relevant section when pathname changes
  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      for (const cat of categories) {
        const onCategoryPath = pathname === `/categories/${cat.id}`;
        const hasActiveProject = cat.projects.some((p) => pathname === `/projects/${p.id}`);
        if (onCategoryPath || hasActiveProject) next[cat.id] = true;
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
    const tempCat: CategoryWithProjects = {
      id: tempId,
      name: name.trim(),
      slug,
      isDefault: false,
      isPersonal: false,
      order: 999,
      projects: [],
    };
    setOptimisticCats((prev) => [...prev, tempCat]);
    setOpenMap((prev) => ({ ...prev, [tempId]: false }));
  }

  const teamCats = [...categories.filter((c) => !c.isPersonal), ...optimisticCats];
  const personalCat = categories.find((c) => c.isPersonal) ?? null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-[2rem] border border-border/70 bg-sidebar p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <BrandMark />

      <nav className="mt-6 flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-0.5">
        {/* ── Team category sections ──────────────────────────────────────── */}
        {teamCats.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] ?? Folder;
          const isActive =
            pathname === `/categories/${cat.id}` ||
            cat.projects.some((p) => pathname === `/projects/${p.id}`);
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
              isMovePending={pendingCategoryIds.includes(cat.id)}
            />
          );
        })}

        {/* ── Add category (Admin only) ─────────────────────────────────── */}
        {role === "ADMIN" && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-[1.25rem] px-3 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add category
          </button>
        )}

        {/* ── Personal section ────────────────────────────────────────────── */}
        {personalCat && (
          <>
            <div className="my-1 border-t border-border/40" />
            <CategorySection
              key={personalCat.id}
              cat={personalCat}
              icon={Lock}
              active={
                pathname === `/categories/${personalCat.id}` ||
                personalCat.projects.some((p) => pathname === `/projects/${p.id}`)
              }
              open={openMap[personalCat.id] ?? false}
              pathname={pathname}
              onToggle={() => toggle(personalCat.id)}
              isOptimistic={false}
              isMovePending={pendingCategoryIds.includes(personalCat.id)}
              isPersonal
            />
          </>
        )}

        {/* ── Bottom nav ──────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-1 pt-2">
          {[
            { href: "/sharing", label: "Sharing", icon: Share2, adminOnly: false },
            { href: "/activity", label: "Activity", icon: Activity, adminOnly: true },
            { href: "/settings", label: "Settings", icon: Settings2, adminOnly: false },
          ].filter((item) => !item.adminOnly || role === "ADMIN").map((item) => {
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

          {clerkEnabled && (
            <>
              <div className="my-1 border-t border-border/40" />
              <SidebarUser />
            </>
          )}
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

// ─── SidebarUser ─────────────────────────────────────────────────────────────

function SidebarUser() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-foreground"
        >
          Sign in
        </button>
      </SignInButton>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Account";
  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] px-3 py-2.5">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "size-7 ring-0 shadow-none",
            userButtonTrigger: "flex items-center justify-center rounded-full p-0",
          },
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-tight">{name}</p>
        {email && (
          <p className="truncate text-xs text-muted-foreground leading-tight">{email}</p>
        )}
      </div>
    </div>
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
  isMovePending,
  isPersonal,
}: {
  cat: CategoryWithProjects;
  icon: React.ElementType;
  active: boolean;
  open: boolean;
  pathname: string;
  onToggle: () => void;
  isOptimistic?: boolean;
  isMovePending?: boolean;
  isPersonal?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category-drop-${cat.id}`,
    data: { type: "category", categoryId: cat.id },
    disabled: isOptimistic,
  });

  const rowClass = cn(
    "group flex w-full cursor-default items-center gap-3 rounded-[1.25rem] px-3 py-3 text-sm font-medium transition-all duration-200",
    isOptimistic
      ? "cursor-default text-muted-foreground opacity-60"
      : isOver
        ? "border border-primary/50 bg-primary/10 text-foreground shadow-lg shadow-slate-950/10"
        : active
          ? "border border-border/80 bg-accent text-accent-foreground shadow-lg shadow-slate-950/10"
          : isPersonal
            ? "border border-primary/20 bg-primary/5 text-foreground/80 hover:bg-primary/10 hover:text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );

  return (
    <div ref={setNodeRef} className="space-y-1.5">
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
              {isMovePending
                ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                : <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              }
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
            {cat.projects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
            ) : (
              cat.projects.map((project) => (
                <ProjectLink key={project.id} project={project} pathname={pathname} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProjectLink ───────────────────────────────────────────────────────────────

function ProjectLink({ project, pathname }: { project: ProjectRow; pathname: string }) {
  const active = pathname === `/projects/${project.id}`;
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `sidebar-project-${project.id}`,
    data: {
      type: "project",
      projectId: project.id,
      fromCategoryId: project.categoryId,
      projectName: project.name,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          "flex cursor-grab items-center justify-between gap-3 rounded-[1rem] px-3 py-2 text-sm transition-all duration-200 active:cursor-grabbing",
          active
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <span className="truncate">{project.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{project.recordCount}</span>
      </Link>
    </div>
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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleCreate() {
    if (!name.trim() || isPending) return;
    const trimmed = name.trim();
    setError(null);
    onOptimisticAdd(trimmed);
    onOpenChange(false);
    startTransition(async () => {
      try {
        await createCategory(trimmed);
        onRefresh();
      } catch {
        setError("Failed to create category. Please try again.");
        onOpenChange(true);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Add a top-level category to organise your projects.
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
        {error && (
          <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
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
