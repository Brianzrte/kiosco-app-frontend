import { SaleDetail } from "@/components/sales/SaleDetail";
import { requireRole } from "@/lib/roles";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["admin", "cashier"]);
  const { id } = await params;
  return <SaleDetail id={id} roles={session.roles} />;
}
