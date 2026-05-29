import { notFound } from "next/navigation";

import { ClientDirectory } from "@/components/app/client-directory";
import { getCategories } from "@/lib/actions/categories";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const categories = await getCategories();

  const currentCategory = categories.find((c) => c.id === categoryId);
  if (!currentCategory) notFound();

  return (
    <ClientDirectory
      initialClients={currentCategory.clients}
      categories={categories}
      defaultCategoryId={categoryId}
    />
  );
}
