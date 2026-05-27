import { ClientTitleProvider } from "@/contexts/client-title";
import { getClientById } from "@/lib/mock-data";

type ClientLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
};

export default async function ClientLayout({ children, params }: ClientLayoutProps) {
  const { clientId } = await params;
  const client = getClientById(clientId);

  return (
    <ClientTitleProvider name={client?.name ?? "Client"}>
      {children}
    </ClientTitleProvider>
  );
}
