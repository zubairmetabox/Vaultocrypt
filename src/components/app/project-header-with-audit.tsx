"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProjectDetailsCard } from "@/components/app/project-details-card";
import { ProjectAuditTrail } from "@/components/app/project-audit-trail";
import type { CategoryRow } from "@/lib/actions/categories";
import type { ProjectAuditEventRow } from "@/lib/actions/audit-events";

type Props = {
  // ProjectDetailsCard props
  projectId: string;
  initialName: string;
  initialContact: string;
  initialVertical: string;
  initialStatus: "Active" | "Inactive";
  currentCategoryId: string | null;
  categories: CategoryRow[];
  // Audit trail props
  initialEvents: ProjectAuditEventRow[];
  role: "ADMIN" | "USER" | "NONE";
};

export function ProjectHeaderWithAudit({
  projectId,
  initialName,
  initialContact,
  initialVertical,
  initialStatus,
  currentCategoryId,
  categories,
  initialEvents,
  role,
}: Props) {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <>
      <ProjectDetailsCard
        projectId={projectId}
        initialName={initialName}
        initialContact={initialContact}
        initialVertical={initialVertical}
        initialStatus={initialStatus}
        currentCategoryId={currentCategoryId}
        categories={categories}
        mobileAuditButton={
          <Button
            size="sm"
            variant="outline"
            className="xl:hidden"
            onClick={() => setAuditOpen(true)}
          >
            <ClipboardList className="size-4" />
            Audit Trail
          </Button>
        }
      />

      {/* Mobile audit trail sheet (hidden on xl+) */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
          auditOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setAuditOpen(false)}
      />

      {/* Slide-from-right panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(90vw,400px)] flex-col overflow-hidden rounded-l-[2rem] border-l border-border/80 bg-background shadow-2xl transition-transform duration-300 ease-in-out xl:hidden ${
          auditOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
          <p className="text-sm font-semibold tracking-tight">Audit Trail</p>
          <Button size="icon-sm" variant="ghost" onClick={() => setAuditOpen(false)}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="app-scrollbar flex-1 overflow-y-auto p-4">
          <ProjectAuditTrail
            initialEvents={initialEvents}
            projectId={projectId}
            role={role}
          />
        </div>
      </div>
    </>
  );
}
