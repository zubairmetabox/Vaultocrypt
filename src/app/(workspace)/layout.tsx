export const dynamic = "force-dynamic";

import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getCategories } from "@/lib/actions/categories";
import { getCurrentRole } from "@/lib/auth/get-role";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  const [categories, role] = await Promise.all([getCategories(), getCurrentRole()]);

  return (
    <WorkspaceShell clerkEnabled={clerkEnabled} categories={categories} role={role}>
      {children}
    </WorkspaceShell>
  );
}
