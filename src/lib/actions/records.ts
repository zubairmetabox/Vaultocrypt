"use server";

import { revalidatePath } from "next/cache";
import { RecordType } from "@prisma/client";

import { decrypt, encrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordRow = {
  id: string;
  clientId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE";
  serviceName: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
  isRestricted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns record metadata — no secret. Used for the record listing. */
export async function getRecords(clientId: string): Promise<RecordRow[]> {
  return db.record.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientId: true,
      title: true,
      type: true,
      serviceName: true,
      url: true,
      username: true,
      notes: true,
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
  const record = await db.record.findUniqueOrThrow({
    where: { id: recordId },
    select: { secretCipher: true },
  });

  return record.secretCipher ? decrypt(record.secretCipher) : "";
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateRecordInput = {
  clientId: string;
  title: string;
  type: "CREDENTIAL" | "SECURE_NOTE";
  serviceName?: string;
  url?: string;
  username?: string;
  secretValue?: string;
  notes?: string;
};

export async function createRecord(input: CreateRecordInput) {
  const record = await db.record.create({
    data: {
      clientId: input.clientId,
      title: input.title.trim(),
      type: input.type as RecordType,
      serviceName: input.serviceName?.trim() || null,
      url: input.url?.trim() || null,
      username: input.username?.trim() || null,
      secretCipher: input.secretValue ? encrypt(input.secretValue) : null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath(`/clients/${input.clientId}`);
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
};

export async function updateRecord(recordId: string, clientId: string, input: UpdateRecordInput) {
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
    },
  });
  revalidatePath(`/clients/${clientId}`);
  return record;
}

export async function deleteRecord(recordId: string, clientId: string) {
  await db.record.delete({ where: { id: recordId } });
  revalidatePath(`/clients/${clientId}`);
}
