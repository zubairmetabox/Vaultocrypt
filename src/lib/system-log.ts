import { prisma } from "@/lib/db";

export async function writeSystemLog(
  source: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: { source, message, metadata: metadata ? (metadata as object) : undefined },
    });
  } catch (err) {
    // Log to console so it's visible in Vercel function logs, but never throw —
    // logging failures must never break the operation being logged.
    console.error("[system-log] Failed to write log:", source, message, err);
  }
}
