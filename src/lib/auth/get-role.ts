import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

export type AppRole = "ADMIN" | "USER";

export async function getCurrentRole(): Promise<AppRole> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return "USER";

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, role: true },
    });

    if (!user) return "USER";

    // Bootstrap: if no admin exists yet, promote this user automatically
    if (user.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount === 0) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
        return "ADMIN";
      }
    }

    return user.role === "ADMIN" ? "ADMIN" : "USER";
  } catch {
    return "USER";
  }
}
