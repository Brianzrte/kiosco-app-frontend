import { SalesView } from "@/components/sales/SalesView";
import { requireRole } from "@/lib/roles";

export default async function SalesPage() {
  const session = await requireRole(["admin", "cashier"]);
  return <SalesView role={session.role} />;
}
