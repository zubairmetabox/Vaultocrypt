"use server";

import { revalidatePath } from "next/cache";
import { ClientStatus, RecordType } from "@prisma/client";

import { encrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";

export type ImportClientInput = {
  name: string;
  contact?: string;
  vertical?: string;
  categoryId?: string;
  status?: "ACTIVE" | "INACTIVE";
  records: Array<{
    title: string;
    type: "CREDENTIAL" | "SECURE_NOTE";
    serviceName?: string;
    url?: string;
    username?: string;
    secretValue?: string;
    notes?: string;
  }>;
};

export async function importClients(clients: ImportClientInput[]) {
  let clientCount = 0;
  let recordCount = 0;

  for (const c of clients) {
    const created = await db.client.create({
      data: {
        name: c.name.trim(),
        contact: c.contact?.trim() || null,
        vertical: c.vertical?.trim() || null,
        categoryId: c.categoryId ?? null,
        status: (c.status as ClientStatus) ?? ClientStatus.ACTIVE,
        records: {
          create: c.records.map((r) => ({
            title: r.title.trim(),
            type: r.type as RecordType,
            serviceName: r.serviceName?.trim() || null,
            url: r.url?.trim() || null,
            username: r.username?.trim() || null,
            secretCipher: r.secretValue ? encrypt(r.secretValue) : null,
            notes: r.notes?.trim() || null,
          })),
        },
      },
      include: { _count: { select: { records: true } } },
    });

    clientCount += 1;
    recordCount += created._count.records;
  }

  revalidatePath("/");
  return { clientCount, recordCount };
}
