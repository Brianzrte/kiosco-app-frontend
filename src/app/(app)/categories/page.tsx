import { requireRole } from "@/lib/roles";
import { CategoriesView } from "@/components/categories/CategoriesView";

export default async function CategoriesPage() {
  await requireRole(["admin"]);
  return <CategoriesView />;
}
