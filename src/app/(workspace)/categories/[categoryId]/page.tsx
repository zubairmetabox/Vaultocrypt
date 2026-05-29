import { notFound } from "next/navigation";

import { ProjectDirectory } from "@/components/app/project-directory";
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
    <ProjectDirectory
      initialProjects={currentCategory.projects}
      categories={categories}
      defaultCategoryId={categoryId}
    />
  );
}
