import { ClientTitleProvider } from "@/contexts/client-title";
import { getClientName } from "@/lib/actions/clients";

type ClientLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
};

export default async function ClientLayout({ children, params }: ClientLayoutProps) {
  const { clientId } = await params;
  const name = await getClientName(clientId);

  return (
    <ClientTitleProvider name={name ?? "Client"}>
      {children}
    </ClientTitleProvider>
  );
}
