"use server";

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuditAction } from "@prisma/client";

import { decrypt } from "@/lib/crypto";
import { prisma as db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { sendShareNotification, sendOtpEmail } from "@/lib/email";
import { getAppSettings } from "@/lib/actions/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpiryOption = "1h" | "24h" | "7d" | "30d" | "never";

export type SharedBundleRow = {
  id: string;
  projectId: string;
  projectName: string;
  clientEmail: string;
  recordIds: string[];
  recordTitles: string[];
  expiresAt: Date | null;
  expiredManually: boolean;
  createdAt: Date;
  createdByName: string;
};

export type VerifyOtpResult =
  | {
      ok: true;
      projectName: string;
      expiresAt: Date | null;
      records: {
        id: string;
        title: string;
        type: string;
        secret: string | null;
        username: string | null;
        url: string | null;
        serviceName: string | null;
        notes: string | null;
      }[];
    }
  | { ok: false; reason: "expired" | "invalid" | "locked" | "no_otp" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function expiryToLabel(option: ExpiryOption): string {
  const labels: Record<ExpiryOption, string> = {
    "1h": "1 hour",
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
    never: "never",
  };
  return labels[option];
}

function isBundleActive(bundle: { expiresAt: Date | null; expiredManually: boolean }): boolean {
  if (bundle.expiredManually) return false;
  if (bundle.expiresAt && bundle.expiresAt < new Date()) return false;
  return true;
}

function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(otp, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyOtpHash(otp: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(otp, salt, 32);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function generateOtp(): string {
  // Cryptographically random 6-digit code
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSharedBundle(
  projectId: string,
  recordIds: string[],
  expiry: ExpiryOption,
  clientEmail: string,
): Promise<{ id: string }> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const role = await getCurrentRole();
  if (role === "NONE") throw new Error("Unauthorized");

  if (recordIds.length === 0) throw new Error("Select at least one record");
  if (!clientEmail.trim()) throw new Error("Client email is required");

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!user) throw new Error("User not found in system");

  const records = await db.record.findMany({
    where: { id: { in: recordIds }, projectId },
    select: { id: true, title: true },
  });
  if (records.length !== recordIds.length) throw new Error("Invalid record selection");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { name: true },
  });

  const expiresAt = expiryToDate(expiry);

  const bundle = await db.sharedBundle.create({
    data: {
      createdById: user.id,
      projectId,
      recordIds,
      clientEmail: clientEmail.trim().toLowerCase(),
      expiresAt,
    },
  });

  await writeAudit({
    action: AuditAction.SHARE_CREATED,
    resource: "shared_bundle",
    resourceId: bundle.id,
    projectId,
    metadata: { recordIds, expiry, expiresAt, clientEmail: bundle.clientEmail },
  });

  // Send share notification email
  const settings = await getAppSettings();
  const fromEmail = settings.sharingFromEmail;
  if (fromEmail) {
    const senderName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Your team";
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultocrypt.vercel.app"}/share/${bundle.id}`;

    await sendShareNotification({
      to: bundle.clientEmail,
      from: fromEmail,
      shareUrl,
      projectName: project.name,
      recordTitles: records.map((r) => r.title),
      expiresLabel: expiryToLabel(expiry),
      senderName,
    });
  }

  revalidatePath("/sharing");
  return { id: bundle.id };
}

// ─── Request OTP (public — no auth) ──────────────────────────────────────────

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export type RequestOtpResult =
  | { ok: true; cooldownUntil: Date }
  | { ok: false; reason: "expired" | "locked" };

export async function requestBundleOtp(bundleId: string): Promise<RequestOtpResult> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: {
      expiresAt: true,
      expiredManually: true,
      otpLockedUntil: true,
      otpSentAt: true,
      clientEmail: true,
      projectId: true,
      project: { select: { name: true } },
    },
  });

  if (!bundle || !isBundleActive(bundle)) return { ok: false, reason: "expired" };
  if (bundle.otpLockedUntil && bundle.otpLockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }

  // Enforce resend cooldown
  if (bundle.otpSentAt) {
    const elapsed = Date.now() - bundle.otpSentAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const cooldownUntil = new Date(bundle.otpSentAt.getTime() + OTP_RESEND_COOLDOWN_MS);
      return { ok: true, cooldownUntil };
    }
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const now = new Date();

  await db.sharedBundle.update({
    where: { id: bundleId },
    data: { otpHash, otpExpiresAt, otpSentAt: now, otpAttempts: 0 },
  });

  // Send OTP email
  const settings = await getAppSettings();
  const fromEmail = settings.sharingFromEmail;
  if (fromEmail) {
    await sendOtpEmail({
      to: bundle.clientEmail,
      from: fromEmail,
      otp,
      projectName: bundle.project.name,
    });
  }

  return { ok: true, cooldownUntil: new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS) };
}

// ─── Verify OTP (public — no auth) ───────────────────────────────────────────

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

export async function verifyBundleOtp(bundleId: string, otp: string): Promise<VerifyOtpResult> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: {
      otpHash: true,
      otpExpiresAt: true,
      otpAttempts: true,
      otpLockedUntil: true,
      expiresAt: true,
      expiredManually: true,
      recordIds: true,
      projectId: true,
      project: { select: { name: true } },
      clientEmail: true,
    },
  });

  if (!bundle || !isBundleActive(bundle)) return { ok: false, reason: "expired" };
  if (bundle.otpLockedUntil && bundle.otpLockedUntil > new Date()) {
    return { ok: false, reason: "locked" };
  }
  if (!bundle.otpHash || !bundle.otpExpiresAt) return { ok: false, reason: "no_otp" };
  if (bundle.otpExpiresAt < new Date()) return { ok: false, reason: "no_otp" };

  if (!verifyOtpHash(otp.trim(), bundle.otpHash)) {
    const newCount = bundle.otpAttempts + 1;
    await db.sharedBundle.update({
      where: { id: bundleId },
      data: {
        otpAttempts: newCount,
        ...(newCount >= MAX_OTP_ATTEMPTS
          ? { otpLockedUntil: new Date(Date.now() + OTP_LOCK_MS) }
          : {}),
      },
    });
    return { ok: false, reason: "invalid" };
  }

  // Valid — clear OTP so it can't be reused
  await db.sharedBundle.update({
    where: { id: bundleId },
    data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
  });

  // Log access audit event
  const h = await headers();
  const rawIp = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown";
  const ip = rawIp.split(",")[0].trim().slice(0, 45);
  const userAgent = h.get("user-agent")?.slice(0, 512) ?? "unknown";

  await db.auditEvent.create({
    data: {
      action: AuditAction.SHARE_REVEALED,
      resource: "shared_bundle",
      resourceId: bundleId,
      projectId: bundle.projectId,
      metadata: { event: "access", ip, userAgent },
    },
  });

  // Fetch records + decrypt secrets inline
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
  });

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
      secret: r.secretCipher ? decrypt(r.secretCipher) : null,
      username: r.username,
      url: r.url,
      serviceName: r.serviceName,
      notes: r.notes,
    })),
  };
}

// ─── Status check (public) ────────────────────────────────────────────────────

export async function checkBundleStatus(bundleId: string): Promise<{ active: boolean }> {
  const bundle = await db.sharedBundle.findUnique({
    where: { id: bundleId },
    select: { expiresAt: true, expiredManually: true },
  });
  if (!bundle) return { active: false };
  return { active: isBundleActive(bundle) };
}

// ─── List bundles ─────────────────────────────────────────────────────────────

export async function getSharedBundles(): Promise<SharedBundleRow[]> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");
  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const isAdmin = role === "ADMIN";
  const user = await db.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const bundles = await db.sharedBundle.findMany({
    where: {
      OR: [
        { createdById: user.id },
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
    clientEmail: b.clientEmail,
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

// ─── Bundle detail ────────────────────────────────────────────────────────────

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

export type BundleAuditEventRow = BundleDetail["auditEvents"][number];

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
  if (isPersonal && !isCreator) throw new Error("Unauthorized");
  if (!isPersonal && role !== "ADMIN" && !isCreator) throw new Error("Unauthorized");

  const recordMap = new Map<string, string>();
  if (bundle.recordIds.length > 0) {
    const recs = await db.record.findMany({
      where: { id: { in: bundle.recordIds } },
      select: { id: true, title: true },
    });
    for (const r of recs) recordMap.set(r.id, r.title);
  }

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
    clientEmail: bundle.clientEmail,
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

// ─── Expire ───────────────────────────────────────────────────────────────────

export async function expireSharedBundle(bundleId: string): Promise<void> {
  const { getCurrentRole } = await import("@/lib/auth/get-role");
  const { auth } = await import("@clerk/nextjs/server");
  const [role, { userId: clerkUserId }] = await Promise.all([getCurrentRole(), auth()]);
  if (role === "NONE" || !clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (!user) throw new Error("User not found");

  const bundle = await db.sharedBundle.findUniqueOrThrow({
    where: { id: bundleId },
    select: {
      createdById: true,
      projectId: true,
      project: { select: { category: { select: { ownerId: true } } } },
    },
  });

  const isPersonal = Boolean(bundle.project.category?.ownerId);
  const isCreator = bundle.createdById === user.id;
  if (isPersonal && !isCreator) throw new Error("Unauthorized");
  if (!isPersonal && role !== "ADMIN" && !isCreator) throw new Error("Unauthorized");

  await db.sharedBundle.update({ where: { id: bundleId }, data: { expiredManually: true } });

  await writeAudit({
    action: AuditAction.SHARE_EXPIRED,
    resource: "shared_bundle",
    resourceId: bundleId,
    projectId: bundle.projectId,
    metadata: { expiredBy: user.id },
  });

  revalidatePath("/sharing");
}
