"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, ClientStatus } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
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

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectRow[]> {
  const rows = await db.project.findMany({
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
      _count: { select: { records: true } },
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
  return db.project.findUnique({
    where: { id: projectId },
    include: {
      records: {
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
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
}

export async function getInternalProjects() {
  const internal = await db.category.findUnique({
    where: { slug: "internal" },
    include: {
      projects: {
        orderBy: { name: "asc" },
        include: {
          records: {
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
  return internal?.projects ?? [];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateProjectInput = {
  name: string;
  contact?: string;
  vertical?: string;
  categoryId?: string;
};

export async function createProject(input: CreateProjectInput) {
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

export async function deleteProjects(projectIds: string[]) {
  await Promise.all(
    projectIds.map((id) =>
      writeAudit({ action: AuditAction.CLIENT_DELETED, resource: "project", resourceId: id }),
    ),
  );
  await db.project.deleteMany({ where: { id: { in: projectIds } } });
  revalidatePath("/");
}

export async function moveProjects(projectIds: string[], categoryId: string) {
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
