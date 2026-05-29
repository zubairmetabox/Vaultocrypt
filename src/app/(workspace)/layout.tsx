import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getCategories } from "@/lib/actions/categories";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  const categories = await getCategories();

  return (
    <WorkspaceShell clerkEnabled={clerkEnabled} categories={categories}>
      {children}
    </WorkspaceShell>
  );
}
