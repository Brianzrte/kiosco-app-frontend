import { PurchasingHubView } from "@/components/purchasing/PurchasingHubView";
import { requireRole } from "@/lib/roles";

export default async function PurchasingPage() {
  const session = await requireRole(["admin", "inventory", "receiving", "cashier"]);
  return <PurchasingHubView roles={session.roles} />;
}
