import { requireRole } from "@/lib/roles";
import { ExpenseCategoriesView } from "@/components/expenses/ExpenseCategoriesView";

export default async function ExpenseCategoriesPage() {
  await requireRole(["admin"]);
  return <ExpenseCategoriesView />;
}
