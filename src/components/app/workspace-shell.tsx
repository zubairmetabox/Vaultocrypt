"use client";

import Link from "next/link";
import { GripVertical, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { CategoryActions } from "@/components/app/category-actions";
import { HeaderAuth } from "@/components/app/header-auth";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { moveProjects } from "@/lib/actions/projects";
import { SearchProvider, useSearch } from "@/contexts/search";
import type { CategoryWithProjects } from "@/lib/actions/categories";

type WorkspaceShellProps = {
  children: React.ReactNode;
  clerkEnabled: boolean;
  categories: CategoryWithProjects[];
};

const staticPageMeta: Record<string, { title: string; eyebrow?: string }> = {
  "/": { title: "Project Directory" },
  "/activity": { title: "Activity" },
  "/settings": { title: "Settings", eyebrow: "Preferences and controls" },
};

export function WorkspaceShell({ children, clerkEnabled, categories }: WorkspaceShellProps) {
  return (
    <SearchProvider>
      <WorkspaceShellInner clerkEnabled={clerkEnabled} categories={categories}>
        {children}
      </WorkspaceShellInner>
    </SearchProvider>
  );
}

function WorkspaceShellInner({ children, clerkEnabled, categories }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDrag, setActiveDrag] = useState<{ projectName: string } | null>(null);
  const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>([]);

  // Clear pending loaders once the refreshed categories prop arrives (UI updated)
  useEffect(() => {
    setPendingCategoryIds([]);
  }, [categories]);

  const { setQuery } = useSearch();
  const [searchValue, setSearchValue] = useState("");

  // Clear search whenever the user navigates to a different page
  useEffect(() => {
    setSearchValue("");
    setQuery("");
  }, [pathname, setQuery]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearchValue(v);
    setQuery(v);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart({ active }: DragStartEvent) {
    const d = active.data.current;
    if (d?.type === "project") setActiveDrag({ projectName: d.projectName });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(null);
    if (!over) return;
    const d = active.data.current;
    const t = over.data.current;
    if (d?.type !== "project" || t?.type !== "category") return;
    if (d.fromCategoryId === t.categoryId) return;
    const affected = [d.fromCategoryId, t.categoryId].filter(Boolean) as string[];
    setPendingCategoryIds(affected);
    startTransition(async () => {
      await moveProjects([d.projectId], t.categoryId);
      router.refresh();
    });
  }

  // All projects flattened — used for breadcrumb on /projects/[id]
  const allProjects = categories.flatMap((c) => c.projects);

  const activeProjectId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const activeProject = activeProjectId ? allProjects.find((p) => p.id === activeProjectId) : null;

  // The category that owns the active project (drives the breadcrumb parent link)
  const activeProjectCategory = activeProject
    ? categories.find((c) => c.projects.some((p) => p.id === activeProject.id))
    : null;

  const activeCategoryId = pathname.startsWith("/categories/") ? pathname.split("/")[2] : null;
  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : null;

  let currentPage: { title: string; eyebrow?: string };
  if (activeProject) {
    currentPage = { title: activeProject.name };
  } else if (activeCategory) {
    currentPage = { title: activeCategory.name };
  } else {
    currentPage = staticPageMeta[pathname] ?? staticPageMeta["/"];
  }

  const showBreadcrumb = Boolean(activeProject);

  return (
    <DndContext id="workspace-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--app-shell-bg)" }}
    >
      <div className="mx-auto grid h-full max-w-[1820px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden h-full lg:block">
          <Sidebar pathname={pathname} categories={categories} pendingCategoryIds={isPending ? pendingCategoryIds : []} />
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-background shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)]">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="lg:hidden">
                      <Menu className="size-4" />
                      <span className="sr-only">Open navigation</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs" showCloseButton={false}>
                    <DialogTitle className="sr-only">Navigation</DialogTitle>
                    <DialogDescription className="sr-only">
                      Workspace navigation
                    </DialogDescription>
                    <DialogBody className="p-3">
                      <Sidebar pathname={pathname} categories={categories} pendingCategoryIds={isPending ? pendingCategoryIds : []} />
                    </DialogBody>
                  </DialogContent>
                </Dialog>

                <div className="hidden min-w-0 flex-1 items-center lg:flex">
                  <div className="flex w-full max-w-xl items-center gap-2 rounded-[1.25rem] border border-border/70 bg-card/70 px-3 py-2 shadow-sm">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                      value={searchValue}
                      onChange={handleSearchChange}
                      placeholder="Search projects, records, and notes"
                      className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <HeaderAuth clerkEnabled={clerkEnabled} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  {showBreadcrumb ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link
                        href={activeProjectCategory ? `/categories/${activeProjectCategory.id}` : "/"}
                        className="transition-colors duration-200 hover:text-foreground"
                      >
                        {activeProjectCategory?.name ?? "Projects"}
                      </Link>
                      <span>/</span>
                      <span className="text-foreground">{currentPage.title}</span>
                    </div>
                  ) : currentPage.eyebrow ? (
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      {currentPage.eyebrow}
                    </p>
                  ) : null}
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {currentPage.title}
                  </h1>
                </div>

                {activeCategory && (
                  <CategoryActions
                    categoryId={activeCategory.id}
                    categoryName={activeCategory.name}
                    isDefault={activeCategory.isDefault}
                    projectCount={activeCategory.projects.length}
                  />
                )}
              </div>
            </div>
          </header>

          <main className="app-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>

    <DragOverlay dropAnimation={null}>
      {activeDrag && (
        <div className="flex items-center gap-2 rounded-[1rem] border border-primary/40 bg-background px-3 py-2 text-sm font-medium shadow-xl ring-1 ring-primary/20">
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-[180px] truncate">{activeDrag.projectName}</span>
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );
}
