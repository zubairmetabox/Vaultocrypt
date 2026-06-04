"use server";

import { AuditAction } from "@prisma/client";

import { prisma } from "@/lib/db";

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
