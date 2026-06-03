"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AppRole as PrismaAppRole } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

import { writeAudit } from "@/lib/audit";
import { getCurrentRole } from "@/lib/auth/get-role";
import { lookupClerkUserByEmail } from "@/lib/auth/clerk-lookup";
import { prisma } from "@/lib/db";

export type AdminRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  isSelf: boolean;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAdmins(currentUserId: string | null): Promise<AdminRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") return [];

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });

  return admins.map((u) => ({ ...u, isSelf: u.id === currentUserId }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Add an admin by email — creates a stub if the user doesn't exist yet. */
export async function addAdmin(email: string) {
  const callerRole = await getCurrentRole();
  if (callerRole !== "ADMIN") throw new Error("Unauthorized");

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email is required.");

  let user = await prisma.user.findUnique({ where: { email: trimmed } });

  if (user) {
    if (user.role === "ADMIN") throw new Error("This user is already an Admin.");
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  } else {
    const profile = await lookupClerkUserByEmail(trimmed);
    user = await prisma.user.create({
      data: {
        email: trimmed,
        role: "ADMIN" as PrismaAppRole,
        clerkUserId: profile.clerkUserId ?? undefined,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
    });
  }

  await writeAudit({
    action: AuditAction.ROLE_CHANGED,
    resource: "user",
    resourceId: user.id,
    metadata: { newRole: "ADMIN" },
  });

  revalidatePath("/settings");
}

/** Remove admin status from a user (demotes to USER). Cannot remove yourself. */
export async function removeAdmin(userId: string) {
  const callerRole = await getCurrentRole();
  if (callerRole !== "ADMIN") throw new Error("Unauthorized");

  const { userId: clerkUserId } = await auth();
  if (clerkUserId) {
    const self = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
    if (self?.id === userId) throw new Error("You cannot remove your own admin role.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "USER" as PrismaAppRole },
  });

  await writeAudit({
    action: AuditAction.ROLE_CHANGED,
    resource: "user",
    resourceId: userId,
    metadata: { newRole: "USER" },
  });

  revalidatePath("/settings");
}
