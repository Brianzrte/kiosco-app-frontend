import { requireRole } from "@/lib/roles";
import { PosView } from "@/components/pos/PosView";

export default async function PosPage() {
  const session = await requireRole(["cashier", "admin"]);
  return <PosView roles={session.roles} />;
}
