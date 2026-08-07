import { requireRole } from "@/lib/roles";
import { PayrollEmployeeView } from "@/components/expenses/PayrollEmployeeView";

export default async function PayrollEmployeePage({ params }: { params: Promise<{ userId: string }> }) {
  await requireRole(["admin"]);
  const { userId } = await params;
  return <PayrollEmployeeView userId={userId} />;
}
