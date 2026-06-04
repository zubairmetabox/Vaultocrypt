"use server";

import { revalidatePath } from "next/cache";

import { getCurrentRole } from "@/lib/auth/get-role";
import { prisma as db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import type { ProjectRow } from "@/lib/actions/projects";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  isPersonal: boolean;
  order: number;
};

export type CategoryWithProjects = CategoryRow & {
  projects: ProjectRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDefaults() {
  await db.category.createMany({
    data: [
      { name: "Clients", slug: "clients", isDefault: true, order: 0 },
      { name: "Internal", slug: "internal", isDefault: true, order: 1 },
    ],
    skipDuplicates: true,
  });
}

async function migrateOrphans() {
  const clientsCategory = await db.category.findFirst({ where: { slug: "clients", ownerId: null } });
  if (!clientsCategory) return;
  await db.project.updateMany({
    where: { categoryId: null },
    data: { categoryId: clientsCategory.id },
  });
}

export async function getCurrentDbUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function getAccessibleCategoryIds(): Promise<string[]> {
  const role = await getCurrentRole();
  const currentUserId = await getCurrentDbUserId();

  if (!currentUserId) return [];

  const rows = await db.category.findMany({
    where:
      role === "ADMIN"
        ? {
            OR: [{ ownerId: null }, { ownerId: currentUserId }],
          }
        : {
            OR: [
              { ownerId: currentUserId },
              { ownerId: null, userAccess: { some: { userId: currentUserId } } },
            ],
          },
    select: { id: true },
  });

  return rows.map((row) => row.id);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryWithProjects[]> {
  await ensureDefaults();
  await migrateOrphans();
  const accessibleCategoryIds = await getAccessibleCategoryIds();

  const rows = await db.category.findMany({
    where: { id: { in: accessibleCategoryIds } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      projects: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          contact: true,
          vertical: true,
          status: true,
          categoryId: true,
          isRestricted: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { records: true } },
        },
      },
    },
  });

  return rows.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    isDefault: cat.isDefault,
    isPersonal: cat.ownerId !== null,
    order: cat.order,
    projects: cat.projects.map((p) => ({
      id: p.id,
      name: p.name,
      contact: p.contact,
      vertical: p.vertical,
      status: p.status as "ACTIVE" | "INACTIVE",
      categoryId: p.categoryId,
      isRestricted: p.isRestricted,
      recordCount: p._count.records,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  }));
}

export async function getProjectsByCategory(categoryId: string) {
  return db.category.findUnique({
    where: { id: categoryId },
    include: {
      projects: {
        orderBy: { name: "asc" },
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
            },
          },
        },
      },
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createCategory(name: string): Promise<CategoryRow> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const slug = toSlug(name);
  const maxOrder = await db.category.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const cat = await db.category.create({
    data: { name: name.trim(), slug, order: nextOrder },
  });

  revalidatePath("/", "layout");
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    isDefault: cat.isDefault,
    isPersonal: cat.ownerId !== null,
    order: cat.order,
  };
}

export async function updateCategory(id: string, name: string): Promise<CategoryRow> {
  const [role, currentUserId] = await Promise.all([getCurrentRole(), getCurrentDbUserId()]);
  const existing = await db.category.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!existing) throw new Error("Category not found.");
  if (existing.ownerId) {
    if (!currentUserId || existing.ownerId !== currentUserId) throw new Error("Unauthorized");
  } else if (role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const cat = await db.category.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath("/", "layout");
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    isDefault: cat.isDefault,
    isPersonal: cat.ownerId !== null,
    order: cat.order,
  };
}

export async function deleteCategory(id: string) {
  const [role, currentUserId] = await Promise.all([getCurrentRole(), getCurrentDbUserId()]);
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, ownerId: true, isDefault: true },
  });

  if (!category) throw new Error("Category not found.");
  if (category.ownerId) {
    if (!currentUserId || category.ownerId !== currentUserId) throw new Error("Unauthorized");
  } else {
    if (role !== "ADMIN") throw new Error("Unauthorized");
    if (category.isDefault) throw new Error("Default categories cannot be deleted.");
  }

  const fallback = await db.category.findFirst({ where: { slug: "clients", ownerId: null } });
  if (fallback) {
    await db.project.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id } });
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}
