"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, RecordSensitivity, RecordType } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordRow = {
  id: string;
  projectId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE";
  serviceName: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
  sensitivity: "STANDARD" | "SENSITIVE";
  isRestricted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns record metadata — no secret. Used for the record listing. */
export async function getRecords(projectId: string): Promise<RecordRow[]> {
  return db.record.findMany({
    where: { projectId },
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
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Privileged action — decrypts and returns the secret value.
 * Must only be called from a server action; never exposed to the client directly.
 */
export async function revealSecret(recordId: string): Promise<string> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const role = await getCurrentRole();
  if (role === "NONE") throw new Error("Unauthorized");

  const record = await db.record.findUniqueOrThrow({
    where: { id: recordId },
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

/** Privileged action — logs SECRET_COPIED then returns the decrypted value for clipboard use. */
export async function copySecret(recordId: string): Promise<string> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const role = await getCurrentRole();
  if (role === "NONE") throw new Error("Unauthorized");

  const record = await db.record.findUniqueOrThrow({
    where: { id: recordId },
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
  // Snapshot current values before overwriting so history can be revealed later
  const prev = await db.record.findUniqueOrThrow({
    where: { id: recordId },
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
        secretCipher: prev.secretCipher, // stored encrypted — revealed via revealAuditValues
        notes: prev.notes,
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return record;
}

export async function deleteRecord(recordId: string, projectId: string) {
  await writeAudit({
    action: AuditAction.RECORD_DELETED,
    resource: "record",
    resourceId: recordId,
    projectId,
    recordId,
  });
  await db.record.delete({ where: { id: recordId } });
  revalidatePath(`/projects/${projectId}`);
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
