import { ReceivingDetailView } from "@/components/purchasing/ReceivingDetailView";
import { requireRole } from "@/lib/roles";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "cashier", "inventory", "receiving"]);
  const { id } = await params;
  return <ReceivingDetailView id={id} />;
}
