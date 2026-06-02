import { auth, currentUser } from "@clerk/nextjs/server";
import { AuditAction } from "@prisma/client";

import { prisma } from "@/lib/db";

async function resolveActorId(): Promise<string | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? null;

    const user = await prisma.user.upsert({
      where: { clerkUserId },
      create: {
        clerkUserId,
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      update: {
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      select: { id: true },
    });
    return user.id;
  } catch {
    return null;
  }
}

type WriteAuditParams = {
  action: AuditAction;
  resource: string;
  resourceId: string;
  projectId?: string | null;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(params: WriteAuditParams): Promise<void> {
  try {
    const actorId = await resolveActorId();
    await prisma.auditEvent.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        actorId,
        projectId: params.projectId ?? null,
        recordId: params.recordId ?? null,
        metadata: params.metadata as object | undefined,
      },
    });
  } catch {
    // Audit failures must never break the main operation
  }
}
