import { ClientDirectory } from "@/components/app/client-directory";
import { getClients } from "@/lib/actions/clients";

export default async function HomePage() {
  const clients = await getClients();
  return <ClientDirectory initialClients={clients} />;
}
