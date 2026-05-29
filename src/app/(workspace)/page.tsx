import { ClientDirectory } from "@/components/app/client-directory";
import { getCategories } from "@/lib/actions/categories";
import { getClients } from "@/lib/actions/clients";

export default async function HomePage() {
  const [clients, categories] = await Promise.all([getClients(), getCategories()]);
  return <ClientDirectory initialClients={clients} categories={categories} />;
}
