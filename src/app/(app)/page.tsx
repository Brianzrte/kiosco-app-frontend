import { requireRole } from "@/lib/roles";
import { PosView } from "@/components/pos/PosView";

export default async function PosPage() {
  await requireRole(["cashier", "admin"]);
  return <PosView />;
}
