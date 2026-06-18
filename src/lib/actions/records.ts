"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, RecordSensitivity, RecordType } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";
import { getCurrentDbUserId } from "@/lib/actions/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordRow = {
  id: string;
  projectId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE" | "ENV_FILE";
  serviceName: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
  sensitivity: "STANDARD" | "SENSITIVE";
  isRestricted: boolean;
  hasHistory: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Batches a display-name lookup for a set of user ids (e.g. record uploaders). */
export async function getUserDisplayNames(userIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();

  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  return new Map(
    users.map((u) => [
      u.id,
      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown",
    ]),
  );
}

export type ArchivedRecordRow = {
  id: string;
  projectId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE" | "ENV_FILE";
  serviceName: string | null;
  username: string | null;
  archivedAt: Date;
};

// ─── Shared auth helper ───────────────────────────────────────────────────────

async function requireAccess() {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { getAccessibleCategoryIds } = await import("@/lib/actions/categories");
  const [role, accessibleCategoryIds] = await Promise.all([
    getCurrentRole(),
    getAccessibleCategoryIds(),
  ]);
  if (role === "NONE") throw new Error("Unauthorized");
  return { role, accessibleCategoryIds };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns active (non-archived) record metadata. Used for the record listing. */
export async function getRecords(projectId: string): Promise<RecordRow[]> {
  return db.record.findMany({
    where: { projectId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      type: true,
      serviceName: true,
      url: true,
      username: true,
      notes: true,
      sensitivity: true,
      isRestricted: true,
      hasHistory: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function revealSecret(recordId: string): Promise<string> {
  const { role, accessibleCategoryIds } = await requireAccess();

  const record = await db.record.findFirstOrThrow({
    where: { id: recordId, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { secretCipher: true, projectId: true, title: true, isRestricted: true },
  });

  if (record.isRestricted && role !== "ADMIN") throw new Error("Unauthorized");

  await writeAudit({
    action: AuditAction.SECRET_REVEALED,
    resource: "record",
    resourceId: recordId,
    projectId: record.projectId,
    recordId,
    metadata: { recordTitle: record.title },
  });
  return record.secretCipher ? decrypt(record.secretCipher) : "";
}

export async function copySecret(recordId: string): Promise<string> {
  const { role, accessibleCategoryIds } = await requireAccess();

  const record = await db.record.findFirstOrThrow({
    where: { id: recordId, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { secretCipher: true, projectId: true, title: true, isRestricted: true },
  });

  if (record.isRestricted && role !== "ADMIN") throw new Error("Unauthorized");

  await writeAudit({
    action: AuditAction.SECRET_COPIED,
    resource: "record",
    resourceId: recordId,
    projectId: record.projectId,
    recordId,
    metadata: { recordTitle: record.title },
  });
  return record.secretCipher ? decrypt(record.secretCipher) : "";
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateRecordInput = {
  projectId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE";
  serviceName?: string;
  url?: string;
  username?: string;
  secretValue?: string;
  notes?: string;
  sensitivity?: "STANDARD" | "SENSITIVE";
};

export async function createRecord(input: CreateRecordInput) {
  const record = await db.record.create({
    data: {
      projectId: input.projectId,
      title: input.title.trim(),
      type: input.type as RecordType,
      serviceName: input.serviceName?.trim() || null,
      url: input.url?.trim() || null,
      username: input.username?.trim() || null,
      secretCipher: input.secretValue ? encrypt(input.secretValue) : null,
      notes: input.notes?.trim() || null,
      sensitivity: (input.sensitivity as RecordSensitivity) ?? RecordSensitivity.SENSITIVE,
    },
  });
  await writeAudit({
    action: AuditAction.RECORD_CREATED,
    resource: "record",
    resourceId: record.id,
    projectId: input.projectId,
    recordId: record.id,
    metadata: { title: record.title, type: record.type },
  });
  revalidatePath(`/projects/${input.projectId}`);
  return record;
}

export type UpdateRecordInput = {
  title?: string;
  type?: "CREDENTIAL" | "SECURE_NOTE";
  serviceName?: string;
  url?: string;
  username?: string;
  secretValue?: string;
  notes?: string;
  sensitivity?: "STANDARD" | "SENSITIVE";
};

export async function updateRecord(recordId: string, projectId: string, input: UpdateRecordInput) {
  const { accessibleCategoryIds } = await requireAccess();

  // Snapshot current values — also serves as the scope/existence check
  const prev = await db.record.findFirstOrThrow({
    where: { id: recordId, project: { categoryId: { in: accessibleCategoryIds } } },
    select: {
      title: true,
      type: true,
      serviceName: true,
      url: true,
      username: true,
      secretCipher: true,
      notes: true,
    },
  });

  const record = await db.record.update({
    where: { id: recordId },
    data: {
      hasHistory: true,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type as RecordType }),
      ...(input.serviceName !== undefined && { serviceName: input.serviceName.trim() || null }),
      ...(input.url !== undefined && { url: input.url.trim() || null }),
      ...(input.username !== undefined && { username: input.username.trim() || null }),
      ...(input.secretValue !== undefined && {
        secretCipher: input.secretValue ? encrypt(input.secretValue) : null,
      }),
      ...(input.notes !== undefined && { notes: input.notes.trim() || null }),
      ...(input.sensitivity !== undefined && { sensitivity: input.sensitivity as RecordSensitivity }),
    },
  });

  await writeAudit({
    action: AuditAction.RECORD_UPDATED,
    resource: "record",
    resourceId: recordId,
    projectId,
    recordId,
    metadata: {
      updatedFields: Object.keys(input),
      prev: {
        title: prev.title,
        type: prev.type,
        serviceName: prev.serviceName,
        url: prev.url,
        username: prev.username,
        secretCipher: prev.secretCipher,
        notes: prev.notes,
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return record;
}

/** Soft-delete: moves a record to the archive. */
export async function archiveRecord(recordId: string, projectId: string) {
  const { accessibleCategoryIds } = await requireAccess();

  const record = await db.record.findFirstOrThrow({
    where: { id: recordId, archivedAt: null, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { id: true, title: true },
  });

  await db.record.update({
    where: { id: record.id },
    data: { archivedAt: new Date() },
  });
  await writeAudit({
    action: AuditAction.RECORD_ARCHIVED,
    resource: "record",
    resourceId: recordId,
    projectId,
    recordId,
    metadata: { recordTitle: record.title },
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Restores an archived record back to active. */
export async function restoreRecord(recordId: string, projectId: string) {
  const { accessibleCategoryIds } = await requireAccess();

  const record = await db.record.findFirstOrThrow({
    where: { id: recordId, archivedAt: { not: null }, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { id: true, title: true },
  });

  await db.record.update({
    where: { id: record.id },
    data: { archivedAt: null },
  });
  await writeAudit({
    action: AuditAction.RECORD_RESTORED,
    resource: "record",
    resourceId: recordId,
    projectId,
    recordId,
    metadata: { recordTitle: record.title },
  });
  revalidatePath(`/projects/${projectId}`);
}

/** Permanently deletes an archived record. Admin only. */
export async function permanentlyDeleteRecord(recordId: string, projectId: string) {
  const { role, accessibleCategoryIds } = await requireAccess();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const record = await db.record.findFirstOrThrow({
    where: { id: recordId, archivedAt: { not: null }, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { id: true, title: true },
  });

  await writeAudit({
    action: AuditAction.RECORD_DELETED,
    resource: "record",
    resourceId: recordId,
    projectId,
    recordId,
    metadata: { recordTitle: record.title },
  });
  await db.record.delete({ where: { id: record.id } });
  revalidatePath(`/projects/${projectId}`);
}

/** Returns archived records for a project, scoped to caller's accessible categories. */
export async function getArchivedRecords(projectId: string): Promise<ArchivedRecordRow[]> {
  const { accessibleCategoryIds } = await requireAccess();

  const rows = await db.record.findMany({
    where: {
      projectId,
      archivedAt: { not: null },
      project: { categoryId: { in: accessibleCategoryIds } },
    },
    orderBy: { archivedAt: "desc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      type: true,
      serviceName: true,
      username: true,
      archivedAt: true,
    },
  });

  return rows.map((r) => ({ ...r, archivedAt: r.archivedAt! }));
}

export type AuditPrevValues = {
  title: string | null;
  type: string | null;
  serviceName: string | null;
  url: string | null;
  username: string | null;
  secret: string | null;
  notes: string | null;
};

/** Admin-only: decrypts and returns the previous field values stored in an audit event. */
export async function revealAuditValues(auditEventId: string): Promise<AuditPrevValues> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const event = await db.auditEvent.findUniqueOrThrow({
    where: { id: auditEventId },
    select: { metadata: true },
  });

  const meta = event.metadata as Record<string, unknown> | null;
  const prev = (meta?.prev ?? {}) as Record<string, unknown>;

  return {
    title: (prev.title as string | null) ?? null,
    type: (prev.type as string | null) ?? null,
    serviceName: (prev.serviceName as string | null) ?? null,
    url: (prev.url as string | null) ?? null,
    username: (prev.username as string | null) ?? null,
    secret: prev.secretCipher ? decrypt(prev.secretCipher as string) : null,
    notes: (prev.notes as string | null) ?? null,
  };
}

export async function moveRecord(recordId: string, fromProjectId: string, toProjectId: string) {
  const { accessibleCategoryIds } = await requireAccess();

  // Verify source record is within caller's scope
  await db.record.findFirstOrThrow({
    where: { id: recordId, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { id: true },
  });

  // Verify destination project is within caller's scope
  const destProject = await db.project.findFirst({
    where: { id: toProjectId, categoryId: { in: accessibleCategoryIds } },
    select: { id: true },
  });
  if (!destProject) throw new Error("Unauthorized");

  await db.record.update({ where: { id: recordId }, data: { projectId: toProjectId } });
  await writeAudit({
    action: AuditAction.RECORD_UPDATED,
    resource: "record",
    resourceId: recordId,
    projectId: fromProjectId,
    recordId,
    metadata: { movedToProjectId: toProjectId },
  });
  revalidatePath(`/projects/${fromProjectId}`);
  revalidatePath(`/projects/${toProjectId}`);
}

/**
 * Uploads (or re-uploads) a .env file for the current user on a project.
 * Each dev's file is kept as its own record, keyed by (project, uploader, filename) —
 * re-uploading the same filename replaces that dev's own copy instead of creating a duplicate.
 */
export async function uploadEnvFile(projectId: string, filename: string, content: string) {
  const { accessibleCategoryIds } = await requireAccess();

  const project = await db.project.findFirst({
    where: { id: projectId, categoryId: { in: accessibleCategoryIds } },
    select: { id: true },
  });
  if (!project) throw new Error("Unauthorized");

  const currentUserId = await getCurrentDbUserId();
  const title = filename.trim();

  const existing = await db.record.findFirst({
    where: {
      projectId,
      type: RecordType.ENV_FILE,
      title,
      createdById: currentUserId,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (existing) {
    const record = await db.record.update({
      where: { id: existing.id },
      data: {
        secretCipher: encrypt(content),
        hasHistory: true,
        updatedById: currentUserId,
      },
    });
    await writeAudit({
      action: AuditAction.RECORD_UPDATED,
      resource: "record",
      resourceId: record.id,
      projectId,
      recordId: record.id,
      metadata: { title, type: "ENV_FILE" },
    });
    revalidatePath(`/projects/${projectId}`);
    return record;
  }

  const record = await db.record.create({
    data: {
      projectId,
      title,
      type: RecordType.ENV_FILE,
      secretCipher: encrypt(content),
      sensitivity: RecordSensitivity.SENSITIVE,
      createdById: currentUserId,
      updatedById: currentUserId,
    },
  });
  await writeAudit({
    action: AuditAction.RECORD_CREATED,
    resource: "record",
    resourceId: record.id,
    projectId,
    recordId: record.id,
    metadata: { title, type: "ENV_FILE" },
  });
  revalidatePath(`/projects/${projectId}`);
  return record;
}

// ─── History ──────────────────────────────────────────────────────────────────

export type RecordHistoryEntry = {
  id: string;
  createdAt: Date;
  actorName: string | null;
  updatedFields: string[];
  prev: {
    title: string | null;
    username: string | null;
    url: string | null;
    serviceName: string | null;
    notes: string | null;
    hasPrevSecret: boolean;
  };
};

/** Returns the ordered change history for a record (RECORD_UPDATED events with prev values). */
export async function getRecordHistory(recordId: string): Promise<RecordHistoryEntry[]> {
  const { accessibleCategoryIds } = await requireAccess();

  await db.record.findFirstOrThrow({
    where: { id: recordId, project: { categoryId: { in: accessibleCategoryIds } } },
    select: { id: true },
  });

  const events = await db.auditEvent.findMany({
    where: { recordId, action: AuditAction.RECORD_UPDATED },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      metadata: true,
      actor: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return events
    .map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      // Skip move events — they have movedToProjectId but no prev field snapshot
      if (meta.movedToProjectId) return null;
      const prev = (meta.prev ?? null) as Record<string, unknown> | null;
      if (!prev) return null;

      const updatedFields = (meta.updatedFields as string[] | undefined) ?? [];

      return {
        id: e.id,
        createdAt: e.createdAt,
        actorName: e.actor
          ? [e.actor.firstName, e.actor.lastName].filter(Boolean).join(" ") || e.actor.email || null
          : null,
        updatedFields,
        prev: {
          title: (prev.title as string | null) ?? null,
          username: (prev.username as string | null) ?? null,
          url: (prev.url as string | null) ?? null,
          serviceName: (prev.serviceName as string | null) ?? null,
          notes: (prev.notes as string | null) ?? null,
          hasPrevSecret: Boolean(prev.secretCipher),
        },
      };
    })
    .filter((e): e is RecordHistoryEntry => e !== null);
}
