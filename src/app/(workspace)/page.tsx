import { redirect } from "next/navigation";

import { ProjectDirectory } from "@/components/app/project-directory";
import { getCategories } from "@/lib/actions/categories";
import { getProjects } from "@/lib/actions/projects";

export default async function HomePage() {
  const [projects, categories] = await Promise.all([getProjects(), getCategories()]);

  const firstCategory = categories.find((c) => !c.isPersonal) ?? categories[0];
  if (firstCategory) redirect(`/categories/${firstCategory.id}`);

  return <ProjectDirectory initialProjects={projects} categories={categories} />;
}
