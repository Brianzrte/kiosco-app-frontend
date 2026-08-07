import { requireRole } from "@/lib/roles";
import { PayrollView } from "@/components/expenses/PayrollView";

export default async function PayrollPage() {
  await requireRole(["admin"]);
  return <PayrollView />;
}
