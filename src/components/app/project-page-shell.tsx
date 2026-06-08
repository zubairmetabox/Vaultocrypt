"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { ArchivedRecordsSection } from "@/components/app/archived-records-section";
import { ProjectAuditTrail } from "@/components/app/project-audit-trail";
import { ProjectDetailsCard } from "@/components/app/project-details-card";
import { RecordList } from "@/components/app/record-list";
import { Button } from "@/components/ui/button";
import type { CategoryWithProjects } from "@/lib/actions/categories";
import type { ProjectAuditEventRow } from "@/lib/actions/audit-events";
import type { ArchivedRecordRow } from "@/lib/actions/records";
import type { RecordItem } from "@/components/app/record-list";

type Props = {
  projectId: string;
  initialName: string;
  initialContact: string;
  initialVertical: string;
  initialStatus: "Active" | "Inactive";
  currentCategoryId: string | null;
  categories: CategoryWithProjects[];
  initialEvents: ProjectAuditEventRow[];
  role: "ADMIN" | "USER" | "NONE";
  records: RecordItem[];
  archivedRecords: ArchivedRecordRow[];
};

export function ProjectPageShell({
  projectId,
  initialName,
  initialContact,
  initialVertical,
  initialStatus,
  currentCategoryId,
  categories,
  initialEvents,
  role,
  records,
  archivedRecords,
}: Props) {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div
      className={`grid gap-6 ${
        auditOpen ? "2xl:grid-cols-[minmax(0,1fr)_360px]" : ""
      }`}
    >
      {/* ── Main content column ─────────────────────────────────────────────── */}
      <div className="space-y-6">
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
              variant={auditOpen ? "default" : "outline"}
              onClick={() => setAuditOpen((v) => !v)}
            >
              <ClipboardList className="size-4" />
              Audit Trail
            </Button>
          }
        />
        <RecordList projectId={projectId} initialRecords={records} categories={categories} />
        <ArchivedRecordsSection
          projectId={projectId}
          initialRecords={archivedRecords}
          isAdmin={role === "ADMIN"}
        />
      </div>

      {/* ── Desktop audit sidebar (2xl+) ───────────────────────────────────── */}
      <div className={auditOpen ? "hidden self-start 2xl:block" : "hidden"}>
        <ProjectAuditTrail
          initialEvents={initialEvents}
          projectId={projectId}
          role={role}
        />
      </div>

      {/* ── Sheet (< 2xl) ──────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 2xl:hidden ${
          auditOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setAuditOpen(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(90vw,400px)] flex-col overflow-hidden rounded-l-[2rem] border-l border-border/80 bg-background shadow-2xl transition-transform duration-300 ease-in-out 2xl:hidden ${
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
    </div>
  );
}
