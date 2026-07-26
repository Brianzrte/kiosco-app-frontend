import { requireRole } from "@/lib/roles";
import { InventoryView } from "@/components/inventory/InventoryView";

export default async function InventoryPage() {
  await requireRole(["inventory_manager", "admin"]);
  return <InventoryView />;
}
