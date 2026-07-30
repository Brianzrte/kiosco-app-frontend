import { CashClosingStatusReportView } from "@/components/reports/CashClosingStatusReportView";
import { requireRole } from "@/lib/roles";

export default async function CashClosingStatusReportPage() {
  await requireRole(["admin"]);
  return <CashClosingStatusReportView />;
}
