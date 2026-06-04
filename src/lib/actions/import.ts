"use server";

import { revalidatePath } from "next/cache";
import { ClientStatus, RecordType } from "@prisma/client";

import { getAccessibleCategoryIds } from "@/lib/actions/categories";
import { getCurrentRole } from "@/lib/auth/get-role";
import { encrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";

export type ImportProjectInput = {
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

// Keep legacy alias so import-dialog.tsx doesn't need a rename
export type ImportClientInput = ImportProjectInput;

export async function importProjects(projects: ImportProjectInput[]) {
  const role = await getCurrentRole();
  const accessibleCategoryIds = await getAccessibleCategoryIds();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  let projectCount = 0;
  let recordCount = 0;

  for (const p of projects) {
    if (!p.categoryId || !accessibleCategoryIds.includes(p.categoryId)) {
      throw new Error("Unauthorized category.");
    }

    const created = await db.project.create({
      data: {
        name: p.name.trim(),
        contact: p.contact?.trim() || null,
        vertical: p.vertical?.trim() || null,
        categoryId: p.categoryId,
        status: (p.status as ClientStatus) ?? ClientStatus.ACTIVE,
        records: {
          create: p.records.map((r) => ({
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

    projectCount += 1;
    recordCount += created._count.records;
  }

  revalidatePath("/");
  return { projectCount, recordCount };
}

// Keep legacy export so existing callers still compile
export async function importClients(clients: ImportProjectInput[]) {
  return importProjects(clients);
}
