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
  const clientsCategory = await db.category.findUnique({ where: { slug: "clients" } });
  if (!clientsCategory) return;
  await db.project.updateMany({
    where: { categoryId: null },
    data: { categoryId: clientsCategory.id },
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryWithProjects[]> {
  await ensureDefaults();
  await migrateOrphans();

  const role = await getCurrentRole();
  let accessibleCategoryIds: string[] | null = null;

  if (role !== "ADMIN") {
    // Non-admins: only return categories they've been explicitly granted access to
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkUserId },
        select: { categoryAccess: { select: { categoryId: true } } },
      });
      accessibleCategoryIds = user?.categoryAccess.map((a) => a.categoryId) ?? [];
    } else {
      accessibleCategoryIds = [];
    }
  }

  const rows = await db.category.findMany({
    where: accessibleCategoryIds !== null ? { id: { in: accessibleCategoryIds } } : undefined,
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
  const slug = toSlug(name);
  const maxOrder = await db.category.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const cat = await db.category.create({
    data: { name: name.trim(), slug, order: nextOrder },
  });

  revalidatePath("/", "layout");
  return { id: cat.id, name: cat.name, slug: cat.slug, isDefault: cat.isDefault, order: cat.order };
}

export async function updateCategory(id: string, name: string): Promise<CategoryRow> {
  const cat = await db.category.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath("/", "layout");
  return { id: cat.id, name: cat.name, slug: cat.slug, isDefault: cat.isDefault, order: cat.order };
}

export async function deleteCategory(id: string) {
  const fallback = await db.category.findUnique({ where: { slug: "clients" } });
  if (fallback) {
    await db.project.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id } });
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}
