"use client";

import Link from "next/link";
import { GripVertical, Menu, Search, X } from "lucide-react";
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

import { BrandMark } from "@/components/app/brand-mark";
import { CategoryActions } from "@/components/app/category-actions";
import { HeaderAuth } from "@/components/app/header-auth";
import { Sidebar } from "@/components/app/sidebar";
import { Button } from "@/components/ui/button";

import { moveProjects } from "@/lib/actions/projects";
import { SearchProvider, useSearch } from "@/contexts/search";
import { RoleProvider } from "@/contexts/role";
import { ClientTitleProvider, useClientTitle } from "@/contexts/client-title";
import type { AppRole } from "@/lib/auth/get-role";
import type { CategoryWithProjects } from "@/lib/actions/categories";

type WorkspaceShellProps = {
  children: React.ReactNode;
  clerkEnabled: boolean;
  categories: CategoryWithProjects[];
  role: AppRole;
};

const staticPageMeta: Record<string, { title: string; eyebrow?: string }> = {
  "/": { title: "Project Directory" },
  "/activity": { title: "Activity" },
  "/settings": { title: "Settings", eyebrow: "Preferences and controls" },
};

export function WorkspaceShell({ children, clerkEnabled, categories, role }: WorkspaceShellProps) {
  return (
    <RoleProvider role={role}>
      <SearchProvider>
        <ClientTitleProvider>
          <WorkspaceShellInner clerkEnabled={clerkEnabled} categories={categories} role={role}>
            {children}
          </WorkspaceShellInner>
        </ClientTitleProvider>
      </SearchProvider>
    </RoleProvider>
  );
}

function WorkspaceShellInner({ children, clerkEnabled, categories }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDrag, setActiveDrag] = useState<{ projectName: string } | null>(null);
  const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { title: dynamicTitle } = useClientTitle();

  // Close mobile nav on navigation
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Clear pending loaders once the refreshed categories prop arrives
  useEffect(() => {
    setPendingCategoryIds([]);
  }, [categories]);

  const { setQuery } = useSearch();
  const [searchValue, setSearchValue] = useState("");

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

  const allProjects = categories.flatMap((c) => c.projects);

  const activeProjectId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;
  const activeProject = activeProjectId ? allProjects.find((p) => p.id === activeProjectId) : null;

  const activeProjectCategory = activeProject
    ? categories.find((c) => c.projects.some((p) => p.id === activeProject.id))
    : null;

  const activeCategoryId = pathname.startsWith("/categories/") ? pathname.split("/")[2] : null;
  const activeCategory = activeCategoryId
    ? categories.find((c) => c.id === activeCategoryId)
    : null;

  const isBundleDetailPage = /^\/sharing\/[^/]+$/.test(pathname);

  let currentPage: { title: string; eyebrow?: string };
  if (activeProject) {
    currentPage = { title: activeProject.name };
  } else if (activeCategory) {
    currentPage = { title: activeCategory.name };
  } else if (isBundleDetailPage) {
    currentPage = { title: dynamicTitle ?? "Share link" };
  } else {
    currentPage = staticPageMeta[pathname] ?? staticPageMeta["/"];
  }

  const showBreadcrumb = Boolean(activeProject) || isBundleDetailPage;

  return (
    <DndContext id="workspace-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="h-screen overflow-hidden" style={{ background: "var(--app-shell-bg)" }}>

      {/* ── Mobile slide-out sidebar ─────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileNavOpen(false)}
      />
      {/* Drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden rounded-r-[2rem] border-r border-border/80 bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-3 pb-0">
          <span className="sr-only">Navigation</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="size-4" />
            <span className="sr-only">Close navigation</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Sidebar
            pathname={pathname}
            categories={categories}
            pendingCategoryIds={isPending ? pendingCategoryIds : []}
          />
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="mx-auto grid h-full max-w-[1820px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <div className="hidden h-full lg:block">
          <Sidebar pathname={pathname} categories={categories} pendingCategoryIds={isPending ? pendingCategoryIds : []} />
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-background shadow-[0_30px_100px_-50px_rgba(15,23,42,0.45)]">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">

              {/* Top bar */}
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:flex">
                {/* Burger (mobile only) */}
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation</span>
                </Button>

                {/* Center: logo on mobile, search on desktop */}
                <div className="flex min-w-0 items-center justify-center lg:flex-1 lg:justify-start">
                  <div className="lg:hidden">
                    <BrandMark compact />
                  </div>
                  <div className="hidden w-full max-w-xl lg:flex items-center gap-2 rounded-[1.25rem] border border-border/70 bg-card/70 px-3 py-2 shadow-sm">
                    <Search className="size-4 text-muted-foreground" />
                    <input
                      value={searchValue}
                      onChange={handleSearchChange}
                      placeholder="Search projects, records, and notes"
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus:placeholder-transparent"
                    />
                  </div>
                </div>

                {/* Avatar (right) */}
                <div className="flex items-center gap-2">
                  <HeaderAuth clerkEnabled={clerkEnabled} />
                </div>
              </div>

              {/* Breadcrumb / page title row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  {showBreadcrumb ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link
                        href={
                          isBundleDetailPage
                            ? "/sharing"
                            : activeProjectCategory
                              ? `/categories/${activeProjectCategory.id}`
                              : "/"
                        }
                        className="transition-colors duration-200 hover:text-foreground"
                      >
                        {isBundleDetailPage
                          ? "Sharing"
                          : (activeProjectCategory?.name ?? "Projects")}
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
                    isPersonal={activeCategory.isPersonal}
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
