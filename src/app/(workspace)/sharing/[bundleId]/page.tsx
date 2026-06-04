export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getSharedBundleDetail } from "@/lib/actions/sharing";
import { BundleDetailsCard } from "@/components/app/bundle-details-card";
import { BundleRecordsCard } from "@/components/app/bundle-records-card";
import { BundleAuditTrail } from "@/components/app/bundle-audit-trail";

type Props = { params: Promise<{ bundleId: string }> };

export default async function BundleDetailPage({ params }: Props) {
  const { bundleId } = await params;

  let bundle;
  try {
    bundle = await getSharedBundleDetail(bundleId);
  } catch {
    notFound();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <BundleDetailsCard bundle={bundle} />
        <BundleRecordsCard bundle={bundle} />
      </div>
      <div className="self-start">
        <BundleAuditTrail bundle={bundle} />
      </div>
    </div>
  );
}
