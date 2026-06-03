"use server";

import { getCurrentRole } from "@/lib/auth/get-role";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";

function csvCell(value: string | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Admin-only: exports every category → project → record as a CSV,
 * including decrypted secrets. Handle the output file with care —
 * delete after verification.
 */
export async function exportAllRecords(): Promise<string> {
  const role = await getCurrentRole();
  if (role !== "ADMIN") throw new Error("Unauthorized");

  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      projects: {
        orderBy: { name: "asc" },
        select: {
          name: true,
          status: true,
          contact: true,
          vertical: true,
          records: {
            orderBy: { createdAt: "asc" },
            select: {
              title: true,
              type: true,
              serviceName: true,
              url: true,
              username: true,
              secretCipher: true,
              notes: true,
            },
          },
        },
      },
    },
  });

  const headers = [
    "Category",
    "Project",
    "Project Status",
    "Record Title",
    "Record Type",
    "Service",
    "URL",
    "Username",
    "Password / Secret",
    "Notes",
  ];

  const rows: string[] = [headers.map(csvCell).join(",")];

  for (const cat of categories) {
    for (const project of cat.projects) {
      if (project.records.length === 0) {
        // Include projects with no records so nothing is silently omitted
        rows.push(
          [cat.name, project.name, project.status, "", "", "", "", "", "", ""]
            .map(csvCell).join(","),
        );
        continue;
      }
      for (const record of project.records) {
        const secret = record.secretCipher ? decrypt(record.secretCipher) : "";
        rows.push(
          [
            cat.name,
            project.name,
            project.status,
            record.title,
            record.type,
            record.serviceName ?? "",
            record.url ?? "",
            record.username ?? "",
            secret,
            record.notes ?? "",
          ]
            .map(csvCell).join(","),
        );
      }
    }
  }

  return rows.join("\n");
}
