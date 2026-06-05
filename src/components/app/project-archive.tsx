"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArchiveRestore,
  FolderOpen,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { restoreProjects, permanentlyDeleteProjects, type ArchivedProjectRow } from "@/lib/actions/projects";

type Props = {
  initialProjects: ArchivedProjectRow[];
};

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-GB", {
    timeZone: "Indian/Mauritius",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ProjectArchive({ initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<ArchivedProjectRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, startRestore] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleRestore(ids: string[]) {
    setError(null);
    startRestore(async () => {
      try {
        await restoreProjects(ids);
        setProjects((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelected(new Set());
        router.refresh();
      } catch {
        setError("Failed to restore projects. Please try again.");
      }
    });
  }

  function handlePermanentDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setError(null);
    startDelete(async () => {
      try {
        await permanentlyDeleteProjects([target.id]);
        setProjects((prev) => prev.filter((p) => p.id !== target.id));
        setSelected((prev) => { const next = new Set(prev); next.delete(target.id); return next; });
        setConfirmDelete(null);
        router.refresh();
      } catch {
        setError("Failed to permanently delete project. Please try again.");
      }
    });
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <FolderOpen className="size-8 opacity-40" />
        <p className="text-sm">No archived projects</p>
      </div>
    );
  }

  const selectedArr = [...selected];

  return (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[0.875rem] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {selectedArr.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selectedArr.length} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRestore(selectedArr)}
            disabled={isRestoring || isDeleting}
          >
            {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <ArchiveRestore className="size-3.5" />}
            Restore selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={isRestoring || isDeleting}>
            Clear
          </Button>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <input
              type="checkbox"
              checked={selected.has(project.id)}
              onChange={() => toggleSelect(project.id)}
              className="size-4 cursor-pointer accent-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{project.name}</p>
                {project.categoryName && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {project.categoryName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {project.recordCount} record{project.recordCount === 1 ? "" : "s"}
                {" · "}Archived {formatDate(project.archivedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestore([project.id])}
                disabled={isRestoring || isDeleting}
              >
                {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <ArchiveRestore className="size-3.5" />}
                Restore
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(project)}
                disabled={isRestoring || isDeleting}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!isDeleting) setConfirmDelete(o ? confirmDelete : null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Permanently delete project?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{confirmDelete?.name}</span> and all its
              records will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
