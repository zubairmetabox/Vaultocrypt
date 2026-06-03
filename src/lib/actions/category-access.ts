"use server";

import { revalidatePath } from "next/cache";

import { getCurrentRole } from "@/lib/auth/get-role";
import { prisma } from "@/lib/db";

export type CategoryUserRow = {
  id: string;
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type AllUserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCategoryUsers(categoryId: string): Promise<CategoryUserRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") return [];

  const rows = await prisma.categoryAccess.findMany({
    where: { categoryId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.user.id,
    email: r.user.email,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
  }));
}

/** All non-admin users available to be assigned to a category. */
export async function getNonAdminUsers(): Promise<AllUserRow[]> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") return [];

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: { email: "asc" },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  return users;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function addUserToCategory(categoryId: string, userId: string) {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.categoryAccess.upsert({
    where: { categoryId_userId: { categoryId, userId } },
    create: { categoryId, userId },
    update: {},
  });

  revalidatePath(`/categories/${categoryId}`);
  revalidatePath("/settings");
}

export async function removeUserFromCategory(categoryId: string, userId: string) {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.categoryAccess.deleteMany({
    where: { categoryId, userId },
  });

  revalidatePath(`/categories/${categoryId}`);
  revalidatePath("/settings");
}

/** Add a user by email to a category, creating a stub if they don't exist yet. */
export async function addUserToCategoryByEmail(categoryId: string, email: string) {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email is required.");

  let user = await prisma.user.findUnique({ where: { email: trimmed } });
  if (!user) {
    user = await prisma.user.create({ data: { email: trimmed } });
  }

  if (user.role === "ADMIN") throw new Error("Admins already have access to all categories.");

  await prisma.categoryAccess.upsert({
    where: { categoryId_userId: { categoryId, userId: user.id } },
    create: { categoryId, userId: user.id },
    update: {},
  });

  revalidatePath(`/categories/${categoryId}`);
}
