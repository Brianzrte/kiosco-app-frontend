import { PurchaseOrdersHistoryView } from "@/components/purchasing/PurchaseOrdersHistoryView";
import { requireRole } from "@/lib/roles";

export default async function PurchaseOrdersHistoryPage() {
  await requireRole(["admin", "inventory", "receiving"]);
  return <PurchaseOrdersHistoryView />;
}
