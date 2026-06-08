"use server";

import { prisma as db } from "@/lib/db";
import { getCurrentRole } from "@/lib/auth/get-role";

export type AppSettings = {
  sharingFromEmail: string | null;
  sharingFromName: string | null;
};

export type SystemLogRow = {
  id: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export async function getAppSettings(): Promise<AppSettings> {
  const row = await db.appSettings.findUnique({ where: { id: "singleton" } });
  return {
    sharingFromEmail: row?.sharingFromEmail ?? null,
    sharingFromName: row?.sharingFromName ?? null,
  };
}

export async function updateSharingConfig(
  fromEmail: string | null,
  fromName: string | null,
): Promise<void> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  await db.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", sharingFromEmail: fromEmail, sharingFromName: fromName },
    update: { sharingFromEmail: fromEmail, sharingFromName: fromName },
  });
}

export async function getSystemLogs(limit = 50): Promise<SystemLogRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const rows = await db.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    message: r.message,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt,
  }));
}
