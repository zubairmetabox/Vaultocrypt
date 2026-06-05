import { notFound } from "next/navigation";

import { ProjectDetailsCard } from "@/components/app/project-details-card";
import { ProjectAuditTrail } from "@/components/app/project-audit-trail";
import { RecordList } from "@/components/app/record-list";
import { ArchivedRecordsSection } from "@/components/app/archived-records-section";
import { getCategories } from "@/lib/actions/categories";
import { getProjectWithRecords } from "@/lib/actions/projects";
import { getArchivedRecords } from "@/lib/actions/records";
import { getCurrentRole } from "@/lib/auth/get-role";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const [project, categories, role, archivedRecords] = await Promise.all([
    getProjectWithRecords(projectId),
    getCategories(),
    getCurrentRole(),
    getArchivedRecords(projectId),
  ]);

  if (!project) notFound();

  if (project.categoryId) {
    const hasAccess = categories.some((category) => category.id === project.categoryId);
    if (!hasAccess) notFound();
  }

  const records = project.records.map((record) => ({
    id: record.id,
    title: record.title,
    type: (record.type === "CREDENTIAL" ? "credential" : "secure_note") as "credential" | "secure_note",
    serviceName: record.serviceName,
    url: record.url,
    username: record.username,
    notes: record.notes,
    hasEncryptedContent: Boolean(record.secretCipher),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <ProjectDetailsCard
          projectId={project.id}
          initialName={project.name}
          initialContact={project.contact ?? ""}
          initialVertical={project.vertical ?? ""}
          initialStatus={project.status === "ACTIVE" ? "Active" : "Inactive"}
          currentCategoryId={project.categoryId}
          categories={categories}
        />
        <RecordList projectId={project.id} initialRecords={records} categories={categories} />
        <ArchivedRecordsSection
          projectId={project.id}
          initialRecords={archivedRecords}
          isAdmin={role === "ADMIN"}
        />
      </div>

      <div className="self-start">
        <ProjectAuditTrail
          initialEvents={project.auditEvents.map((event) => ({
            ...event,
            metadata: (event.metadata as Record<string, unknown> | null) ?? null,
          }))}
          projectId={project.id}
          role={role}
        />
      </div>
    </div>
  );
}
