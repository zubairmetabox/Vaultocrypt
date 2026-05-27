"use server";

import { revalidatePath } from "next/cache";
import { ClientCategory, ClientStatus } from "@prisma/client";

import { prisma as db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientRow = {
  id: string;
  name: string;
  contact: string | null;
  vertical: string | null;
  status: "ACTIVE" | "INACTIVE";
  category: "CLIENT" | "INTERNAL";
  isRestricted: boolean;
  recordCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getClients(): Promise<ClientRow[]> {
  const rows = await db.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contact: true,
      vertical: true,
      status: true,
      category: true,
      isRestricted: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { records: true } },
    },
  });

  return rows.map((r) => ({
    ...r,
    recordCount: r._count.records,
  }));
}

export async function getClientName(clientId: string): Promise<string | null> {
  const row = await db.client.findUnique({ where: { id: clientId }, select: { name: true } });
  return row?.name ?? null;
}

export async function getClientWithRecords(clientId: string) {
  return db.client.findUnique({
    where: { id: clientId },
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
          // secretCipher intentionally omitted from the listing query
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export type CreateClientInput = {
  name: string;
  contact?: string;
  vertical?: string;
  category?: "CLIENT" | "INTERNAL";
};

export async function createClient(input: CreateClientInput) {
  const client = await db.client.create({
    data: {
      name: input.name.trim(),
      contact: input.contact?.trim() ?? null,
      vertical: input.vertical?.trim() ?? null,
      category: (input.category as ClientCategory) ?? ClientCategory.CLIENT,
    },
  });
  revalidatePath("/");
  return client;
}

export type UpdateClientInput = {
  name?: string;
  contact?: string;
  vertical?: string;
  status?: "ACTIVE" | "INACTIVE";
  category?: "CLIENT" | "INTERNAL";
};

export async function updateClient(clientId: string, input: UpdateClientInput) {
  const client = await db.client.update({
    where: { id: clientId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.contact !== undefined && { contact: input.contact.trim() || null }),
      ...(input.vertical !== undefined && { vertical: input.vertical.trim() || null }),
      ...(input.status !== undefined && { status: input.status as ClientStatus }),
      ...(input.category !== undefined && { category: input.category as ClientCategory }),
    },
  });
  revalidatePath("/");
  revalidatePath(`/clients/${clientId}`);
  return client;
}

export async function deleteClients(clientIds: string[]) {
  await db.client.deleteMany({ where: { id: { in: clientIds } } });
  revalidatePath("/");
}
