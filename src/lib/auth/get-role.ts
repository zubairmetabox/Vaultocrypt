import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

export type AppRole = "ADMIN" | "USER";

export async function getCurrentRole(): Promise<AppRole> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return "USER";

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { role: true },
    });

    return user?.role === "ADMIN" ? "ADMIN" : "USER";
  } catch {
    return "USER";
  }
}
