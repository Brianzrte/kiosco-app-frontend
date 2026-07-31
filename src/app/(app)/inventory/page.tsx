import { requireRole } from "@/lib/roles";
import { hasAnyRole } from "@/lib/roleAccess";
import { InventoryView } from "@/components/inventory/InventoryView";
import { Suspense } from "react";

export default async function InventoryPage() {
  const session = await requireRole(["inventory", "receiving", "admin"]);
  return (
    <Suspense fallback={null}>
      <InventoryView
        canPlanStock={hasAnyRole(session.roles, ["inventory", "admin"])}
      />
    </Suspense>
  );
}
