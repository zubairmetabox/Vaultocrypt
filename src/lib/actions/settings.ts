"use server";

import { prisma as db } from "@/lib/db";
import { getCurrentRole } from "@/lib/auth/get-role";

export type AppSettings = {
  sharingFromEmail: string | null;
};

export async function getAppSettings(): Promise<AppSettings> {
  const row = await db.appSettings.findUnique({ where: { id: "singleton" } });
  return { sharingFromEmail: row?.sharingFromEmail ?? null };
}

export async function updateSharingFromEmail(email: string | null): Promise<void> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  await db.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", sharingFromEmail: email },
    update: { sharingFromEmail: email },
  });
}
