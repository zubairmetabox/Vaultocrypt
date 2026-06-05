"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Building2,
  Check,
  Download,
  FileUp,
  Folder,
  FolderKanban,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { ImportDialog } from "@/components/app/import-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraggable } from "@dnd-kit/core";
import { createProject, archiveProjects, moveProjects, type ProjectRow } from "@/lib/actions/projects";
import { importClients, type ImportClientInput } from "@/lib/actions/import";
import { exportAllRecords } from "@/lib/actions/export";
import type { CategoryRow } from "@/lib/actions/categories";
import { useSearch } from "@/contexts/search";
import { useRole } from "@/contexts/role";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  clients: FolderKanban,
  internal: Building2,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  initialProjects: ProjectRow[];
  categories: CategoryRow[];
  defaultCategoryId?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function csvEscape(value: string | number | null) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function statusLabel(status: "ACTIVE" | "INACTIVE") {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

// ─── DraggableProjectCard ─────────────────────────────────────────────────────

function DraggableProjectCard({
  project,
  selected,
  onToggle,
}: {
  project: ProjectRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `dir-project-${project.id}`,
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
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "group relative rounded-[1.1rem] border bg-background/95 shadow-sm transition-all duration-200",
        isDragging
          ? "opacity-40"
          : selected
            ? "border-ring/60 bg-accent/20 shadow-md"
            : "border-border/70 hover:border-ring/40 hover:bg-accent/35 hover:shadow-md",
      )}
    >
      {/* Drag handle — only this triggers drag */}
      <button
        {...listeners}
        {...attributes}
        aria-label="Drag to move"
        className="absolute top-3 left-3 z-10 flex size-5 touch-none cursor-grab items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100! active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={selected ? `Deselect ${project.name}` : `Select ${project.name}`}
        className="absolute top-3 right-3 z-10 size-5 rounded-full"
      />
      <Link
        href={`/projects/${project.id}`}
        className="flex min-h-20 flex-col justify-between gap-3 py-3 pr-12 pl-10"
      >
        <p className="text-sm font-medium tracking-tight text-foreground">{project.name}</p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {project.recordCount} record{project.recordCount === 1 ? "" : "s"}
          </p>
          <span className="text-xs text-muted-foreground">
            {project.status === "ACTIVE" ? "Active" : "Inactive"}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDirectory({ initialProjects, categories, defaultCategoryId }: Props) {
  const router = useRouter();
  const { query } = useSearch();
  const role = useRole();
  const isAdmin = role === "ADMIN";

  const [isPending, startTransition] = useTransition();
  const [isMoving, startMove] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isExporting, startExport] = useTransition();

  // Add project form state
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newVertical, setNewVertical] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>(
    () => defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const addNameRef = useRef<HTMLInputElement>(null);

  // Keep default in sync if categories load after first render
  useEffect(() => {
    setNewCategoryId((prev) => prev || defaultCategoryId || categories[0]?.id || "");
  }, [categories, defaultCategoryId]);

  const isSearching = query.length >= 3;
  const projects = isSearching
    ? initialProjects.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      )
    : initialProjects;

  const grouped = useMemo(
    () =>
      projects
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .reduce<Record<string, ProjectRow[]>>((acc, p) => {
          const letter = p.name.charAt(0).toUpperCase();
          if (!acc[letter]) acc[letter] = [];
          acc[letter].push(p);
          return acc;
        }, {}),
    [projects],
  );

  const letters = Object.keys(grouped).sort();
  const allSelected = projects.length > 0 && selectedIds.length === projects.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : projects.map((p) => p.id));
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  function exportCsv() {
    const selected = projects.filter((p) => selectedIds.includes(p.id));
    if (!selected.length) return;

    const header = ["id", "name", "contact", "vertical", "status", "record_count"];
    const rows = selected.map((p) => [
      p.id, p.name, p.contact, p.vertical, statusLabel(p.status), p.recordCount,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultocrypt-projects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Move ────────────────────────────────────────────────────────────────────

  // Close move dialog once transition ends (page fully refreshed)
  useEffect(() => {
    if (!isMoving && pendingMove) {
      setMoveOpen(false);
      setSelectedIds([]);
      setSelectedMoveCategory(null);
      setPendingMove(false);
    }
  }, [isMoving, pendingMove]);

  function handleMove() {
    if (!selectedMoveCategory || isMoving) return;
    setMoveError(null);
    setPendingMove(true);
    startMove(async () => {
      try {
        await moveProjects(selectedIds, selectedMoveCategory);
        router.refresh();
      } catch {
        setPendingMove(false);
        setMoveError("Failed to move projects. Please try again.");
      }
    });
  }

  // ── Archive ─────────────────────────────────────────────────────────────────

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await archiveProjects(selectedIds);
        setSelectedIds([]);
        setDeleteOpen(false);
        router.refresh();
      } catch {
        setDeleteError("Failed to archive projects. Please try again.");
      }
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  function resetAddForm() {
    setNewName("");
    setNewContact("");
    setNewVertical("");
    setNewCategoryId(categories[0]?.id ?? "");
  }

  function handleCreate() {
    if (!newName.trim()) return;
    setAddError(null);
    startTransition(async () => {
      try {
        await createProject({
          name: newName,
          contact: newContact,
          vertical: newVertical,
          categoryId: newCategoryId || undefined,
        });
        resetAddForm();
        setAddOpen(false);
        router.refresh();
      } catch {
        setAddError("Failed to create project. Please try again.");
      }
    });
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport(imported: ImportClientInput[]) {
    await importClients(imported);
    router.refresh();
  }

  // ── Export all ──────────────────────────────────────────────────────────────

  function handleExportAll() {
    startExport(async () => {
      const csv = await exportAllRecords();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultocrypt-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <>
    <Card className="border-border/70 bg-card/95">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>Project directory</CardTitle>
            <CardDescription>
              Name-led scanning, visible security posture, and fast access to the next action.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleExportAll}
                  disabled={isExporting}
                >
                  {isExporting
                    ? <Loader2 className="size-4 animate-spin" />
                    : <Download className="size-4" />}
                  Export all
                </Button>
                <Button size="lg" variant="outline" onClick={() => setImportOpen(true)}>
                  <FileUp className="size-4" />
                  Import CSV
                </Button>
                <ImportDialog
                  open={importOpen}
                  onOpenChange={setImportOpen}
                  onImport={handleImport}
                  categories={categories}
                />
              </>
            )}

            {/* Add project dialog */}
            <Dialog
              open={addOpen}
              onOpenChange={(o) => {
                setAddOpen(o);
                if (!o) resetAddForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-lg shadow-cyan-900/10">
                  <Plus className="size-4" />
                  Add project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create project</DialogTitle>
                  <DialogDescription>
                    Add a new project to the directory.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-name">Project name</Label>
                      <Input
                        id="new-name"
                        ref={addNameRef}
                        placeholder="e.g. Acme Corp"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact">Primary contact email</Label>
                      <Input
                        id="new-contact"
                        placeholder="ops@acme.example"
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-vertical">Industry / vertical</Label>
                      <Input
                        id="new-vertical"
                        placeholder="e.g. Healthcare"
                        value={newVertical}
                        onChange={(e) => setNewVertical(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Select
                        value={newCategoryId}
                        onValueChange={setNewCategoryId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newName.trim() || isPending}
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Create project
                  </Button>
                </DialogFooter>
                {addError && (
                  <div className="mx-6 mb-4 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {addError}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {isAdmin && (
        <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 px-6 py-2.5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {allSelected ? "Clear all" : "Select all"}
            </Button>

            {selectedIds.length > 0 && (
              <>
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
                  {selectedIds.length} selected
                </div>
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSelectedMoveCategory(null); setMoveOpen(true); }}
                >
                  <ArrowRightLeft className="size-4" />
                  Move
                </Button>
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="size-4" />
                      Archive
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Archive selected projects</DialogTitle>
                      <DialogDescription>
                        Move {selectedIds.length} project
                        {selectedIds.length === 1 ? "" : "s"} to the archive. Records are preserved
                        and everything can be restored from Settings.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        Move to archive
                      </Button>
                    </DialogFooter>
                    {deleteError && (
                      <div className="mx-6 mb-4 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="size-4 shrink-0" />
                        {deleteError}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear selection
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <CardContent className="space-y-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 py-14 text-center">
            {isSearching ? (
              <>
                <p className="text-sm font-medium text-foreground">No projects match &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-muted-foreground">Try a different name.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">No projects yet</p>
                <p className="text-xs text-muted-foreground">
                  Add your first project or import a CSV to get started.
                </p>
              </>
            )}
          </div>
        ) : (
          letters.map((letter) => (
            <section key={letter} className="space-y-3">
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {letter}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {grouped[letter].map((project) => (
                  <DraggableProjectCard
                    key={project.id}
                    project={project}
                    selected={selectedIds.includes(project.id)}
                    onToggle={() => toggleSelect(project.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </CardContent>
    </Card>

    {/* ── Move projects dialog ──────────────────────────────────────────── */}
    <Dialog
      open={moveOpen}
      onOpenChange={(o) => { if (!isMoving) setMoveOpen(o); }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to category</DialogTitle>
          <DialogDescription>
            Choose where to move{" "}
            <span className="font-medium text-foreground">
              {selectedIds.length} project{selectedIds.length === 1 ? "" : "s"}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {isMoving ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Moving projects…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.slug] ?? Folder;
                const isSelected = selectedMoveCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedMoveCategory(cat.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm transition-all duration-150",
                      isSelected
                        ? "border-primary/50 bg-primary/8 text-foreground"
                        : "border-border/70 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isSelected ? "bg-primary/15" : "bg-muted",
                    )}>
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

        {!isMoving && (
          <>
            {moveError && (
              <div className="mx-6 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {moveError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleMove} disabled={!selectedMoveCategory}>
                <ArrowRightLeft className="size-4" />
                Move projects
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
