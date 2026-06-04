import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

export type AppRole = "ADMIN" | "USER" | "NONE";

export async function getCurrentRole(): Promise<AppRole> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return "NONE";

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

      // 3. Bootstrap: no admins exist yet - make this user the first admin
      if (!user) {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

        if (adminCount === 0) {
          const clerkUser2 = clerkUser ?? (await currentUser());
          const email =
            clerkUser2?.emailAddresses.find(
              (emailAddress) => emailAddress.id === clerkUser2.primaryEmailAddressId,
            )?.emailAddress ?? null;

          user = await prisma.user.create({
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

        // Admins exist but this person was never invited - block them
        if (!user) return "NONE";
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

    return user.role === "ADMIN" ? "ADMIN" : "USER";
  } catch {
    return "NONE";
  }
}
