import { requireRole } from "@/lib/roles";
import { ProductsReportView } from "@/components/reports/ProductsReportView";

export default async function ProductsReportPage() {
  await requireRole(["admin"]);
  return <ProductsReportView />;
}
