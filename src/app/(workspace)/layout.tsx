import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getClients } from "@/lib/actions/clients";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  const clients = await getClients();

  return (
    <WorkspaceShell clerkEnabled={clerkEnabled} clients={clients}>
      {children}
    </WorkspaceShell>
  );
}
