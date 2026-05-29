import { ProjectDirectory } from "@/components/app/project-directory";
import { getCategories } from "@/lib/actions/categories";
import { getProjects } from "@/lib/actions/projects";

export default async function HomePage() {
  const [projects, categories] = await Promise.all([getProjects(), getCategories()]);
  return <ProjectDirectory initialProjects={projects} categories={categories} />;
}
