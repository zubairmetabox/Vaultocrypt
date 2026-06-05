"use server";

import { timingSafeEqual, randomBytes, scryptSync } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuditAction } from "@prisma/client";

import { decrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

// ─── Password generation ──────────────────────────────────────────────────────

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const LOWER = "abcdefghjkmnpqrstuvwxyz";  // no i, l, o
const DIGITS = "23456789";                // no 0, 1
const SYMBOLS = "!@#$%^&*";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomIndex(max: number): number {
  // Rejection sampling to avoid modulo bias
  const limit = Math.floor(256 / max) * max;
  let byte: number;
  do {
    byte = randomBytes(1)[0];
  } while (byte >= limit);
  return byte % max;
}

function generateSharePassword(): string {
  const chars = [
    UPPER[randomIndex(UPPER.length)],
    LOWER[randomIndex(LOWER.length)],
    DIGITS[randomIndex(DIGITS.length)],
    SYMBOLS[randomIndex(SYMBOLS.length)],
    ...Array.from({ length: 8 }, () => ALL[randomIndex(ALL.length)]),
  ];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, 64);
  const len = Math.max(expected.length, actual.length);
  const paddedExpected = Buffer.concat([expected, Buffer.alloc(len - expected.length)]);
  const paddedActual = Buffer.concat([actual, Buffer.alloc(len - actual.length)]);
  return timingSafeEqual(paddedExpected, paddedActual) && expected.length === actual.length;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpiryOption = "1h" | "24h" | "7d" | "30d" | "never";

export type SharedBundleRow = {
  id: string;
  projectId: string;
  projectName: string;
  recordIds: string[];
  recordTitles: string[];
  expiresAt: Date | null;
  expiredManually: boolean;
  createdAt: Date;
  createdByName: string;
};

function expiryToDate(option: ExpiryOption): Date | null {
  if (option === "never") return null;
  const ms: Record<ExpiryOption, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    never: 0,
  };
  return new Date(Date.now() + ms[option]);
}

function isBundleActive(bundle: { expiresAt: Date | null; expiredManually: boolean }): boolean {
  if (bundle.expiredManually) return false;
  if (bundle.expiresAt && bundle.expiresAt < new Date()) return false;
  return true;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSharedBundle(
  projectId: string,
  recordIds: string[],
  expiry: ExpiryOption,
): Promise<{ id: string; password: string }> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const role = await getCurrentRole();
  if (role === "NONE") throw new Error("Unauthorized");

  if (recordIds.length === 0) throw new Error("Select at least one record");

  // Resolve the creator's DB user id
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found in system");

  // Verify the records belong to this project
  const records = await db.record.findMany({
    where: { id: { in: recordIds }, projectId },
    select: { id: true },
  });
  if (records.length !== recordIds.length) throw new Error("Invalid record selection");

  const password = generateSharePassword();
  const passwordHash = hashPassword(password);
  const expiresAt = expiryToDate(expiry);

  const bundle = await db.sharedBundle.create({
    data: {
      createdById: user.id,
      projectId,
      recordIds,
      passwordHash,
      expiresAt,
    },
  });

  await writeAudit({
    action: AuditAction.SHARE_CREATED,
    resource: "shared_bundle",
    resourceId: bundle.id,
    projectId,
    metadata: { recordIds, expiry, expiresAt },
  });

  revalidatePath("/sharing");
  return { id: bundle.id, password };
}

// ─── Audit events only (for live polling on the detail page) ──────────────────

export type BundleAuditEventRow = BundleDetail["auditEvents"][number];

export async function getBundleAuditEvents(bundleId: string): Promise<BundleAuditEventRow[]> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");
  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const bundle = await db.sharedBundle.findUniqueOrThrow({
    where: { id: bundleId },
    select: { createdById: true, project: { select: { category: { select: { ownerId: true } } } } },
  });

  const isPersonal = Boolean(bundle.project.category?.ownerId);
  if (isPersonal && bundle.createdById !== user.id) throw new Error("Unauthorized");
  if (role !== "ADMIN" && bundle.createdById !== user.id) throw new Error("Unauthorized");

  const events = await db.auditEvent.findMany({
    where: { resource: "shared_bundle", resourceId: bundleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, action: true, createdAt: true, metadata: true, recordId: true },
  });

  return events.map((e) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    return {
      id: e.id,
      action: e.action,
      createdAt: e.createdAt,
      recordTitle: (meta.recordTitle as string | null) ?? null,
      ip: (meta.ip as string | null) ?? null,
      userAgent: (meta.userAgent as string | null) ?? null,
    };
  });
}

// ─── Status check (public — no auth, no secrets) ─────────────────────────────

export async function checkBundleStatus(bundleId: string): Promise<{ active: boolean }> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: { expiresAt: true, expiredManually: true },
  });
  if (!bundle) return { active: false };
  return { active: isBundleActive(bundle) };
}

// ─── Verify password (public — no auth) ───────────────────────────────────────

export type VerifyResult =
  | { ok: true; projectName: string; expiresAt: Date | null; records: { id: string; title: string; type: string; hasSecret: boolean; username: string | null; url: string | null; serviceName: string | null; notes: string | null }[] }
  | { ok: false; reason: "expired" | "invalid" | "locked" };

const MAX_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function verifySharePassword(bundleId: string, password: string): Promise<VerifyResult> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: {
      passwordHash: true,
      failedAttempts: true,
      lockedUntil: true,
      expiresAt: true,
      expiredManually: true,
      recordIds: true,
      project: { select: { name: true } },
    },
  });

  if (!bundle) return { ok: false, reason: "expired" };
  if (!isBundleActive(bundle)) return { ok: false, reason: "expired" };

  if (bundle.lockedUntil && bundle.lockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  if (!verifyPassword(password, bundle.passwordHash)) {
    const newCount = bundle.failedAttempts + 1;
    await db.sharedBundle.update({
      where: { id: bundleId },
      data: {
        failedAttempts: newCount,
        ...(newCount >= MAX_ATTEMPTS
          ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
          : {}),
      },
    });
    return { ok: false, reason: "invalid" };
  }

  await db.sharedBundle.update({
    where: { id: bundleId },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  const records = await db.record.findMany({
    where: { id: { in: bundle.recordIds } },
    select: {
      id: true,
      title: true,
      type: true,
      secretCipher: true,
      username: true,
      url: true,
      serviceName: true,
      notes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Return records in the same order as recordIds
  const ordered = bundle.recordIds
    .map((rid) => records.find((r) => r.id === rid))
    .filter(Boolean) as typeof records;

  return {
    ok: true,
    projectName: bundle.project.name,
    expiresAt: bundle.expiresAt,
    records: ordered.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      hasSecret: Boolean(r.secretCipher),
      username: r.username,
      url: r.url,
      serviceName: r.serviceName,
      notes: r.notes,
    })),
  };
}

// ─── Reveal secret on shared page (public — password re-verified) ─────────────

export async function revealSharedSecret(
  bundleId: string,
  recordId: string,
  password: string,
): Promise<string> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: {
      passwordHash: true,
      expiresAt: true,
      expiredManually: true,
      recordIds: true,
      projectId: true,
    },
  });

  if (!bundle || !isBundleActive(bundle)) throw new Error("Link has expired");

  if (!verifyPassword(password, bundle.passwordHash)) throw new Error("Invalid password");

  if (!bundle.recordIds.includes(recordId)) throw new Error("Record not in bundle");

  const record = await db.record.findUniqueOrThrow({
    where: { id: recordId },
    select: { secretCipher: true, title: true },
  });

  // Capture IP + user-agent for the audit trail
  const h = await headers();
  const rawIp = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  const ip = rawIp.split(",")[0].trim().slice(0, 45); // take leftmost, cap at max IPv6 length
  const userAgent = h.get("user-agent")?.slice(0, 512) ?? "unknown";

  await db.auditEvent.create({
    data: {
      action: AuditAction.SHARE_REVEALED,
      resource: "shared_bundle",
      resourceId: bundleId,
      projectId: bundle.projectId,
      recordId,
      metadata: { recordTitle: record.title, ip, userAgent },
    },
  });

  return record.secretCipher ? decrypt(record.secretCipher) : "";
}

// ─── List bundles (workspace) ─────────────────────────────────────────────────

export async function getSharedBundles(): Promise<SharedBundleRow[]> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");

  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const isAdmin = role === "ADMIN";

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  // Scoping rules:
  // - Personal category bundles: creator only (even admins cannot see other users' personal shares)
  // - Team category bundles (ownerId null): admins see all, users see their own
  // - No-category bundles: treated as team scope
  const bundles = await db.sharedBundle.findMany({
    where: {
      OR: [
        // Always see your own, regardless of category type
        { createdById: user.id },
        // Admins also see team-category bundles (not personal)
        ...(isAdmin
          ? [{ project: { category: { ownerId: null } } }, { project: { categoryId: null } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Resolve record titles for each bundle
  const allRecordIds = [...new Set(bundles.flatMap((b) => b.recordIds))];
  const recordMap = new Map<string, string>();
  if (allRecordIds.length > 0) {
    const recs = await db.record.findMany({
      where: { id: { in: allRecordIds } },
      select: { id: true, title: true },
    });
    for (const r of recs) recordMap.set(r.id, r.title);
  }

  return bundles.map((b) => ({
    id: b.id,
    projectId: b.projectId,
    projectName: b.project.name,
    recordIds: b.recordIds,
    recordTitles: b.recordIds.map((rid) => recordMap.get(rid) ?? "Deleted record"),
    expiresAt: b.expiresAt,
    expiredManually: b.expiredManually,
    createdAt: b.createdAt,
    createdByName:
      [b.createdBy.firstName, b.createdBy.lastName].filter(Boolean).join(" ") ||
      b.createdBy.email ||
      "Unknown",
  }));
}

// ─── Get single bundle detail (for sidebar panel) ─────────────────────────────

export type BundleRecord = {
  id: string;
  title: string;
  type: string;
  serviceName: string | null;
  url: string | null;
  username: string | null;
};

export type BundleDetail = SharedBundleRow & {
  sharedRecords: BundleRecord[];
  auditEvents: {
    id: string;
    action: string;
    createdAt: Date;
    recordTitle: string | null;
    ip: string | null;
    userAgent: string | null;
  }[];
};

export async function getSharedBundleDetail(bundleId: string): Promise<BundleDetail> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");

  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const bundle = await db.sharedBundle.findUniqueOrThrow({
    where: { id: bundleId },
    include: {
      project: { select: { name: true, category: { select: { ownerId: true } } } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const isPersonal = Boolean(bundle.project.category?.ownerId);
  const isCreator = bundle.createdById === user.id;

  // Personal category bundles: creator only
  if (isPersonal && !isCreator) throw new Error("Unauthorized");
  // Team bundles: admins + creator
  if (!isPersonal && role !== "ADMIN" && !isCreator) throw new Error("Unauthorized");

  const recordMap = new Map<string, string>();
  if (bundle.recordIds.length > 0) {
    const recs = await db.record.findMany({
      where: { id: { in: bundle.recordIds } },
      select: { id: true, title: true },
    });
    for (const r of recs) recordMap.set(r.id, r.title);
  }

  // Fetch full record data for the detail view
  const sharedRecords: BundleRecord[] = bundle.recordIds.length > 0
    ? (await db.record.findMany({
        where: { id: { in: bundle.recordIds } },
        select: { id: true, title: true, type: true, serviceName: true, url: true, username: true },
      })).sort((a, b) => bundle.recordIds.indexOf(a.id) - bundle.recordIds.indexOf(b.id))
    : [];

  const auditEvents = await db.auditEvent.findMany({
    where: { resource: "shared_bundle", resourceId: bundleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, action: true, createdAt: true, metadata: true, recordId: true },
  });

  return {
    id: bundle.id,
    projectId: bundle.projectId,
    projectName: bundle.project.name,
    recordIds: bundle.recordIds,
    recordTitles: bundle.recordIds.map((rid) => recordMap.get(rid) ?? "Deleted record"),
    expiresAt: bundle.expiresAt,
    expiredManually: bundle.expiredManually,
    createdAt: bundle.createdAt,
    sharedRecords,
    createdByName:
      [bundle.createdBy.firstName, bundle.createdBy.lastName].filter(Boolean).join(" ") ||
      bundle.createdBy.email ||
      "Unknown",
    auditEvents: auditEvents.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      return {
        id: e.id,
        action: e.action,
        createdAt: e.createdAt,
        recordTitle: (meta.recordTitle as string | null) ?? null,
        ip: (meta.ip as string | null) ?? null,
        userAgent: (meta.userAgent as string | null) ?? null,
      };
    }),
  };
}

// ─── Expire now ───────────────────────────────────────────────────────────────

export async function expireSharedBundle(bundleId: string): Promise<void> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");

  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const bundle = await db.sharedBundle.findUniqueOrThrow({
    where: { id: bundleId },
    select: { createdById: true, projectId: true, project: { select: { category: { select: { ownerId: true } } } } },
  });

  const isPersonal = Boolean(bundle.project.category?.ownerId);
  const isCreator = bundle.createdById === user.id;

  if (isPersonal && !isCreator) throw new Error("Unauthorized");
  if (!isPersonal && role !== "ADMIN" && !isCreator) throw new Error("Unauthorized");

  await db.sharedBundle.update({
    where: { id: bundleId },
    data: { expiredManually: true },
  });

  await writeAudit({
    action: AuditAction.SHARE_EXPIRED,
    resource: "shared_bundle",
    resourceId: bundleId,
    projectId: bundle.projectId,
    metadata: { expiredBy: user.id },
  });

  revalidatePath("/sharing");
}
