export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

import { SharePageClient } from "./share-page-client";

type Props = { params: Promise<{ id: string }> };

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  return <SharePageClient bundleId={id} />;
}
