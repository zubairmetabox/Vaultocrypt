"use server";

import { AuditAction } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentRole } from "@/lib/auth/get-role";
import { getAccessibleCategoryIds } from "@/lib/actions/categories";

export type ProjectAuditEventRow = {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  project: { name: string } | null;
  record: { title: string } | null;
};

export async function getProjectAuditEvents(projectId: string, offset = 0, limit = 10): Promise<ProjectAuditEventRow[]> {
  const role = await getCurrentRole();
  if (role === "NONE") throw new Error("Unauthorized");

  const accessibleCategoryIds = await getAccessibleCategoryIds();
  const project = await prisma.project.findFirst({
    where: { id: projectId, categoryId: { in: accessibleCategoryIds } },
    select: { id: true },
  });
  if (!project) throw new Error("Unauthorized");

  const rows = await prisma.auditEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
      project: { select: { name: true } },
      record: { select: { title: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }));
}
