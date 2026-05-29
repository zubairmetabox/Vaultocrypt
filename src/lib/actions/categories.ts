"use server";

import { revalidatePath } from "next/cache";

import { prisma as db } from "@/lib/db";
import type { ClientRow } from "@/lib/actions/clients";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  order: number;
};

export type CategoryWithClients = CategoryRow & {
  clients: ClientRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Creates the two default categories if they don't exist yet. Idempotent + race-safe. */
async function ensureDefaults() {
  await db.category.createMany({
    data: [
      { name: "Clients", slug: "clients", isDefault: true, order: 0 },
      { name: "Internal", slug: "internal", isDefault: true, order: 1 },
    ],
    skipDuplicates: true,
  });
}

/**
 * Any client whose categoryId is null gets moved to the "clients" default.
 * Runs after ensureDefaults so the target category always exists.
 */
async function migrateOrphans() {
  const clientsCategory = await db.category.findUnique({ where: { slug: "clients" } });
  if (!clientsCategory) return;
  await db.client.updateMany({
    where: { categoryId: null },
    data: { categoryId: clientsCategory.id },
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryWithClients[]> {
  await ensureDefaults();
  await migrateOrphans();

  const rows = await db.category.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      clients: {
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
    clients: cat.clients.map((c) => ({
      id: c.id,
      name: c.name,
      contact: c.contact,
      vertical: c.vertical,
      status: c.status as "ACTIVE" | "INACTIVE",
      category: cat.name as "CLIENT" | "INTERNAL", // legacy compat field
      categoryId: c.categoryId,
      isRestricted: c.isRestricted,
      recordCount: c._count.records,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  }));
}

export async function getClientsByCategory(categoryId: string) {
  return db.category.findUnique({
    where: { id: categoryId },
    include: {
      clients: {
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
  // Move all clients in this category to the default "clients" category
  const fallback = await db.category.findUnique({ where: { slug: "clients" } });
  if (fallback) {
    await db.client.updateMany({ where: { categoryId: id }, data: { categoryId: fallback.id } });
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}
