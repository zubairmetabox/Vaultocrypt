export const dynamic = "force-dynamic";

import { getSharedBundles } from "@/lib/actions/sharing";
import { SharingList } from "@/components/app/sharing-list";
import { getCurrentRole } from "@/lib/auth/get-role";

export default async function SharingPage() {
  const [bundles, role] = await Promise.all([getSharedBundles(), getCurrentRole()]);
  return <SharingList initialBundles={bundles} role={role} />;
}
