import { Building2, KeyRound } from "lucide-react";

import { RecordList } from "@/components/app/record-list";
import { Button } from "@/components/ui/button";
import { getInternalClients } from "@/lib/actions/clients";
import type { VaultRecord } from "@/lib/mock-data";
import Link from "next/link";

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

export default async function InternalPage() {
  const groups = await getInternalClients();

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-border/70 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-[1.4rem] bg-muted">
          <Building2 className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No internal entries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a client with category set to <span className="font-medium">Internal</span> to get
            started.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/">Go to Client Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const records: VaultRecord[] = group.records.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type === "CREDENTIAL" ? "credential" : "secure_note",
          service: r.serviceName ?? "",
          url: r.url ?? "",
          username: r.username ?? "",
          secretValue: "",
          notes: r.notes ?? "",
          lastUpdated: formatUpdated(r.updatedAt),
        }));

        return (
          <div key={group.id} className="space-y-3">
            {/* Group header */}
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

            <RecordList clientId={group.id} initialRecords={records} />
          </div>
        );
      })}
    </div>
  );
}
