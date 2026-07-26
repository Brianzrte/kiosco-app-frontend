import { requireRole } from "@/lib/roles";
import { ReportsView } from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  await requireRole(["admin"]);
  return <ReportsView />;
}
