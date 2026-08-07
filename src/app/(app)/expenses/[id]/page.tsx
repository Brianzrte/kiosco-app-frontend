import { requireRole } from "@/lib/roles";
import { ExpenseDetailView } from "@/components/expenses/ExpenseDetailView";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  return <ExpenseDetailView id={id} />;
}
