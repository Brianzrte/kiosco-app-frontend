import { requireRole } from "@/lib/roles";
import { SalesReportView } from "@/components/reports/SalesReportView";

export default async function SalesReportPage() {
  await requireRole(["admin"]);
  return <SalesReportView />;
}
