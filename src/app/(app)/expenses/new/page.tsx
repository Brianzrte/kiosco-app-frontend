import { requireRole } from "@/lib/roles";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";

export default async function NewExpensePage() {
  await requireRole(["admin"]);
  return <ExpenseForm />;
}
