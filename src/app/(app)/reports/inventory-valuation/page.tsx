import { requireRole } from "@/lib/roles";
import { InventoryValuationView } from "@/components/reports/InventoryValuationView";

export default async function InventoryValuationPage() {
  await requireRole(["admin"]);
  return <InventoryValuationView />;
}
