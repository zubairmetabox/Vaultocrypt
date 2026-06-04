export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentRole } from "@/lib/auth/get-role";
import { ActivityClient } from "./activity-client";

export type ActivityActor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type ActivityEvent = {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
  actor: { firstName: string | null; lastName: string | null; email: string | null } | null;
  project: { name: string } | null;
  record: { title: string } | null;
};

export default async function ActivityPage() {
  const role = await getCurrentRole();
  if (role !== "ADMIN") notFound();

  const events = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      actor: { select: { firstName: true, lastName: true, email: true } },
      project: { select: { name: true } },
      record: { select: { title: true } },
    },
  });

  const typed: ActivityEvent[] = events.map((e) => ({
    ...e,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
  }));

  // All users who have ever acted — for the actor filter dropdown
  const actorIds = [...new Set(events.map((e) => e.actorId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  return <ActivityClient events={typed} actors={actors} />;
}
