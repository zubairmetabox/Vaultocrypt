"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AppRole as PrismaAppRole } from "@prisma/client";

import { writeAudit } from "@/lib/audit";
import { getCurrentRole } from "@/lib/auth/get-role";
import { prisma } from "@/lib/db";

export type UserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "USER";
  createdAt: Date;
};

export async function getUsers(): Promise<UserRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") return [];

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  return users.map((u) => ({
    ...u,
    role: u.role === "ADMIN" ? "ADMIN" : ("USER" as const),
  }));
}

export async function inviteUser(email: string, role: "ADMIN" | "USER") {
  const callerRole = await getCurrentRole();
  if (callerRole !== "ADMIN") throw new Error("Unauthorized");

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email is required.");

  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing) throw new Error("A team member with this email already exists.");

  await prisma.user.create({
    data: { email: trimmed, role: role as PrismaAppRole },
  });

  revalidatePath("/settings");
}

export async function updateUserRole(userId: string, newRole: "ADMIN" | "USER") {
  const callerRole = await getCurrentRole();
  if (callerRole !== "ADMIN") throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as PrismaAppRole },
  });

  await writeAudit({
    action: AuditAction.ROLE_CHANGED,
    resource: "user",
    resourceId: userId,
    metadata: { newRole },
  });

  revalidatePath("/settings");
}
