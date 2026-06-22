import { AuditAction } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUserRecord } from "@/lib/auth/get-role";

async function resolveActorId(): Promise<string | null> {
  try {
    // Reuses the same request-cached lookup that getCurrentRole/
    // getCurrentDbUserId already trigger — by the time an audit event is
    // written, the user (incl. any stub-linking/bootstrap) has already
    // been resolved, so this is free rather than a second Clerk API call
    // plus a duplicate DB query.
    const user = await getCurrentUserRecord();
    return user?.id ?? null;
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
  } catch (err) {
    // Audit failures must never break the main operation, but they must be visible in logs
    console.error("[audit] Failed to write audit event:", params.action, params.resourceId, err);
  }
}
