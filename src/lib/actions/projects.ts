"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, ClientStatus } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { getAccessibleCategoryIds } from "@/lib/actions/categories";
import { getCurrentRole } from "@/lib/auth/get-role";
import { prisma as db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectRow = {
  id: string;
  name: string;
  contact: string | null;
  vertical: string | null;
  status: "ACTIVE" | "INACTIVE";
  categoryId: string | null;
  isRestricted: boolean;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ArchivedProjectRow = {
  id: string;
  name: string;
  contact: string | null;
  vertical: string | null;
  status: "ACTIVE" | "INACTIVE";
  categoryId: string | null;
  categoryName: string | null;
  recordCount: number;
  archivedAt: Date;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectRow[]> {
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  if (accessibleCategoryIds.length === 0) return [];

  const rows = await db.project.findMany({
    where: { categoryId: { in: accessibleCategoryIds }, archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contact: true,
      vertical: true,
      status: true,
      categoryId: true,
      isRestricted: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { records: { where: { archivedAt: null } } } },
    },
  });

  return rows.map((r) => ({
    ...r,
    status: r.status as "ACTIVE" | "INACTIVE",
    recordCount: r._count.records,
  }));
}

export async function getProjectName(projectId: string): Promise<string | null> {
  const row = await db.project.findUnique({ where: { id: projectId }, select: { name: true } });
  return row?.name ?? null;
}

export async function getProjectWithRecords(projectId: string) {
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  const project = await db.project.findUnique({
    where: { id: projectId, archivedAt: null },
    include: {
      records: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          serviceName: true,
          url: true,
          username: true,
          secretCipher: true,
          notes: true,
          sensitivity: true,
          isRestricted: true,
          hasHistory: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          actor: { select: { firstName: true, lastName: true, email: true } },
          project: { select: { name: true } },
          record: { select: { title: true } },
        },
      },
    },
  });

  if (!project?.categoryId) return project;
  return accessibleCategoryIds.includes(project.categoryId) ? project : null;
}

export async function getInternalProjects() {
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  const internal = await db.category.findUnique({
    where: { slug: "internal" },
    include: {
      projects: {
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        include: {
          records: {
            where: { archivedAt: null },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              title: true,
              type: true,
              serviceName: true,
              url: true,
              username: true,
              notes: true,
              sensitivity: true,
              isRestricted: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
  if (!internal || !accessibleCategoryIds.includes(internal.id)) return [];
  return internal?.projects ?? [];
}

/** Admin-only: returns all archived projects across all team categories. */
export async function getArchivedProjects(): Promise<ArchivedProjectRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const rows = await db.project.findMany({
    where: { archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      name: true,
      contact: true,
      vertical: true,
      status: true,
      categoryId: true,
      archivedAt: true,
      category: { select: { name: true } },
      _count: { select: { records: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    vertical: r.vertical,
    status: r.status as "ACTIVE" | "INACTIVE",
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    recordCount: r._count.records,
    archivedAt: r.archivedAt!,
  }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateProjectInput = {
  name: string;
  contact?: string;
  vertical?: string;
  categoryId?: string;
};

export async function createProject(input: CreateProjectInput) {
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  if (!input.categoryId) throw new Error("Category is required.");
  if (!accessibleCategoryIds.includes(input.categoryId)) throw new Error("Unauthorized");

  const project = await db.project.create({
    data: {
      name: input.name.trim(),
      contact: input.contact?.trim() ?? null,
      vertical: input.vertical?.trim() ?? null,
      categoryId: input.categoryId ?? null,
    },
  });
  await writeAudit({
    action: AuditAction.CLIENT_CREATED,
    resource: "project",
    resourceId: project.id,
    projectId: project.id,
    metadata: { name: project.name },
  });
  revalidatePath("/");
  return project;
}

export type UpdateProjectInput = {
  name?: string;
  contact?: string;
  vertical?: string;
  status?: "ACTIVE" | "INACTIVE";
  categoryId?: string;
};

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  const existing = await db.project.findUnique({
    where: { id: projectId },
    select: { categoryId: true },
  });

  if (!existing) throw new Error("Project not found.");
  if (existing.categoryId && !accessibleCategoryIds.includes(existing.categoryId)) {
    throw new Error("Unauthorized");
  }
  if (input.categoryId !== undefined && !accessibleCategoryIds.includes(input.categoryId)) {
    throw new Error("Unauthorized");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.contact !== undefined && { contact: input.contact.trim() || null }),
      ...(input.vertical !== undefined && { vertical: input.vertical.trim() || null }),
      ...(input.status !== undefined && { status: input.status as ClientStatus }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    },
  });
  await writeAudit({
    action: AuditAction.CLIENT_UPDATED,
    resource: "project",
    resourceId: projectId,
    projectId,
    metadata: { updatedFields: Object.keys(input) },
  });
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  return project;
}

/** Soft-delete: moves projects to the archive. Admin only. */
export async function archiveProjects(projectIds: string[]) {
  const role = await getCurrentRole();
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const ownedProjects = await db.project.findMany({
    where: { id: { in: projectIds }, categoryId: { in: accessibleCategoryIds }, archivedAt: null },
    select: { id: true, name: true },
  });
  if (ownedProjects.length !== projectIds.length) throw new Error("Unauthorized");

  await db.project.updateMany({
    where: { id: { in: projectIds } },
    data: { archivedAt: new Date() },
  });
  await Promise.all(
    ownedProjects.map((p) =>
      writeAudit({
        action: AuditAction.CLIENT_ARCHIVED,
        resource: "project",
        resourceId: p.id,
        projectId: p.id,
        metadata: { name: p.name },
      }),
    ),
  );
  revalidatePath("/");
}

/** Restores archived projects back to active. Admin only. */
export async function restoreProjects(projectIds: string[]) {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const archivedProjects = await db.project.findMany({
    where: { id: { in: projectIds }, archivedAt: { not: null } },
    select: { id: true, name: true },
  });
  if (archivedProjects.length !== projectIds.length) throw new Error("Projects not found in archive");

  await db.project.updateMany({
    where: { id: { in: projectIds } },
    data: { archivedAt: null },
  });
  await Promise.all(
    archivedProjects.map((p) =>
      writeAudit({
        action: AuditAction.CLIENT_RESTORED,
        resource: "project",
        resourceId: p.id,
        projectId: p.id,
        metadata: { name: p.name },
      }),
    ),
  );
  revalidatePath("/");
  revalidatePath("/settings");
}

/** Permanently deletes archived projects from the database. Admin only. */
export async function permanentlyDeleteProjects(projectIds: string[]) {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const archivedProjects = await db.project.findMany({
    where: { id: { in: projectIds }, archivedAt: { not: null } },
    select: { id: true, name: true },
  });
  if (archivedProjects.length !== projectIds.length) throw new Error("Projects not found in archive");

  await Promise.all(
    archivedProjects.map((p) =>
      writeAudit({
        action: AuditAction.CLIENT_DELETED,
        resource: "project",
        resourceId: p.id,
        metadata: { name: p.name },
      }),
    ),
  );
  await db.project.deleteMany({ where: { id: { in: projectIds } } });
  revalidatePath("/settings");
}

export async function moveProjects(projectIds: string[], categoryId: string) {
  const role = await getCurrentRole();
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  if (role !== "ADMIN") throw new Error("Unauthorized");
  if (!accessibleCategoryIds.includes(categoryId)) throw new Error("Unauthorized");

  const ownedProjects = await db.project.findMany({
    where: { id: { in: projectIds }, categoryId: { in: accessibleCategoryIds } },
    select: { id: true },
  });
  if (ownedProjects.length !== projectIds.length) throw new Error("Unauthorized");

  await db.project.updateMany({
    where: { id: { in: projectIds } },
    data: { categoryId },
  });
  await Promise.all(
    projectIds.map((id) =>
      writeAudit({
        action: AuditAction.CLIENT_UPDATED,
        resource: "project",
        resourceId: id,
        projectId: id,
        metadata: { movedToCategoryId: categoryId },
      }),
    ),
  );
  revalidatePath("/", "layout");
}
