import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { AppRole as DbRole } from "@prisma/client";

import { prisma } from "@/lib/db";

export type AppRole = "ADMIN" | "USER" | "NONE";

export type CurrentUserRecord = { id: string; role: DbRole };

/**
 * Resolves (and lazily bootstraps/links) the current user exactly once per
 * request. getCurrentRole, getCurrentDbUserId, and the audit actor lookup
 * all read from this single cached call instead of each re-querying the
 * same row — without it, a single action like revealing a secret was
 * triggering this user lookup (and its admin-count/personal-category
 * side queries) several times over, which is what made each reveal feel
 * slow on high-latency connections to the DB.
 */
export const getCurrentUserRecord = cache(async (): Promise<CurrentUserRecord | null> => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  // 1. Try to find by clerkUserId
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    // 2. Try to find a pre-added email stub and link it
    const clerkUser = await currentUser();
    const primaryEmail =
      clerkUser?.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? null;

    if (primaryEmail) {
      const stub = await prisma.user.findFirst({
        where: { email: primaryEmail, clerkUserId: null },
        select: { id: true, role: true },
      });

      if (stub) {
        await prisma.user.update({
          where: { id: stub.id },
          data: {
            clerkUserId,
            firstName: clerkUser?.firstName ?? null,
            lastName: clerkUser?.lastName ?? null,
          },
        });
        user = stub;
      }
    }

    // 3. Bootstrap: no admins exist yet — make this user the first admin.
    // Wrapped in a SERIALIZABLE transaction to prevent two simultaneous
    // first-logins both reading adminCount=0 and both becoming ADMIN.
    if (!user) {
      const clerkUser2 = clerkUser ?? (await currentUser());
      const email =
        clerkUser2?.emailAddresses.find(
          (emailAddress) => emailAddress.id === clerkUser2?.primaryEmailAddressId,
        )?.emailAddress ?? null;

      user = await prisma.$transaction(async (tx) => {
        const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
        if (adminCount === 0) {
          return tx.user.create({
            data: {
              clerkUserId,
              email,
              firstName: clerkUser2?.firstName ?? null,
              lastName: clerkUser2?.lastName ?? null,
              role: "ADMIN",
            },
            select: { id: true, role: true },
          });
        }
        return null;
      }, { isolationLevel: "Serializable" });

      // Admins exist but this person was never invited - block them
      if (!user) return null;
    }
  }

  // Auto-promote safety net: if somehow no admin exists, promote this user
  if (user.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      user = { ...user, role: "ADMIN" };
    }
  }

  // Ensure this user has a personal category (silent, one-time)
  await prisma.category.upsert({
    where: { slug: `personal-${user.id}` },
    create: {
      name: "Personal",
      slug: `personal-${user.id}`,
      ownerId: user.id,
      order: 999,
    },
    update: {},
  });

  return user;
});

export async function getCurrentRole(): Promise<AppRole> {
  try {
    const user = await getCurrentUserRecord();
    if (!user) return "NONE";
    return user.role === "ADMIN" ? "ADMIN" : "USER";
  } catch {
    return "NONE";
  }
}
