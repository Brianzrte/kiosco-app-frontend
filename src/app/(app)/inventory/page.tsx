import { requireRole } from "@/lib/roles";
import { hasAnyRole } from "@/lib/roleAccess";
import { InventoryView } from "@/components/inventory/InventoryView";

export default async function InventoryPage() {
  const session = await requireRole(["inventory", "receiving", "admin"]);
  return (
    <InventoryView
      canPlanStock={hasAnyRole(session.roles, ["inventory", "admin"])}
    />
  );
}
