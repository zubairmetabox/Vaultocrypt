import { notFound } from "next/navigation";
import { Folder, KeyRound } from "lucide-react";
import type { Record as PrismaRecord } from "@prisma/client";

import { RecordList } from "@/components/app/record-list";
import { getClientsByCategory } from "@/lib/actions/categories";
import type { VaultRecord } from "@/lib/mock-data";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
};

type RecordShape = Pick<
  PrismaRecord,
  "id" | "title" | "type" | "serviceName" | "url" | "username" | "notes" | "sensitivity" | "isRestricted" | "createdAt" | "updatedAt"
>;

function formatUpdated(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toVaultRecord(r: RecordShape): VaultRecord {
  return {
    id: r.id,
    title: r.title,
    type: r.type === "CREDENTIAL" ? "credential" : "secure_note",
    service: r.serviceName ?? "",
    url: r.url ?? "",
    username: r.username ?? "",
    secretValue: "",
    notes: r.notes ?? "",
    lastUpdated: formatUpdated(r.updatedAt),
  };
}

type CategoryData = NonNullable<Awaited<ReturnType<typeof getClientsByCategory>>>;
type ClientGroup = CategoryData["clients"][number];

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const data = await getClientsByCategory(categoryId);

  if (!data) notFound();

  if (data.clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-border/70 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-[1.4rem] bg-muted">
          <Folder className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No clients in {data.name} yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a client and assign it to the{" "}
            <span className="font-medium">{data.name}</span> category to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.clients.map((group: ClientGroup) => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
              <KeyRound className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{group.name}</p>
              {group.contact && (
                <p className="text-xs text-muted-foreground">{group.contact}</p>
              )}
            </div>
          </div>
          <RecordList
            clientId={group.id}
            initialRecords={group.records.map(toVaultRecord)}
          />
        </div>
      ))}
    </div>
  );
}
