import { requireRole } from "@/lib/roles";
import { ExpensesHubView } from "@/components/expenses/ExpensesHubView";

export default async function ExpensesPage() {
  await requireRole(["admin"]);
  return <ExpensesHubView />;
}
