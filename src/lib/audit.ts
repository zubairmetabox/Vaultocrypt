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

    // 1. Try to find an existing record by clerkUserId
    let user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user && primaryEmail) {
      // 2. Check for a pre-added stub with this email but no clerkUserId yet
      const stub = await prisma.user.findFirst({
        where: { email: primaryEmail, clerkUserId: null },
        select: { id: true },
      });

      if (stub) {
        // Link the stub to this Clerk account on first sign-in
        await prisma.user.update({
          where: { id: stub.id },
          data: { clerkUserId, firstName: clerkUser.firstName, lastName: clerkUser.lastName },
        });
        user = stub;
      }
    }

    if (!user) {
      // 3. No record found — create a new one
      user = await prisma.user.create({
        data: {
          clerkUserId,
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        },
        select: { id: true },
      });
    }

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
