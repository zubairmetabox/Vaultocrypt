import { notFound } from "next/navigation";

import { ProjectPageShell } from "@/components/app/project-page-shell";
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
    hasHistory: record.hasHistory,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));

  return (
    <ProjectPageShell
      projectId={project.id}
      initialName={project.name}
      initialContact={project.contact ?? ""}
      initialVertical={project.vertical ?? ""}
      initialStatus={project.status === "ACTIVE" ? "Active" : "Inactive"}
      currentCategoryId={project.categoryId}
      categories={categories}
      initialEvents={project.auditEvents.map((event) => ({
        ...event,
        metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      }))}
      role={role}
      records={records}
      archivedRecords={archivedRecords}
    />
  );
}
