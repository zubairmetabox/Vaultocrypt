import { WorkspaceShell } from "@/components/app/workspace-shell";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );

  return <WorkspaceShell clerkEnabled={clerkEnabled}>{children}</WorkspaceShell>;
}
