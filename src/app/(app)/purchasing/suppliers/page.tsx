import { SuppliersView } from "@/components/suppliers/SuppliersView";
import { requireRole } from "@/lib/roles";

export default async function PurchasingSuppliersPage() {
  await requireRole(["admin", "inventory"]);
  return <SuppliersView />;
}
