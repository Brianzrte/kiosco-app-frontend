import { requireRole } from "@/lib/roles";
import { PurchasesReportView } from "@/components/reports/PurchasesReportView";

export default async function PurchasesReportPage() {
  await requireRole(["admin"]);
  return <PurchasesReportView />;
}
