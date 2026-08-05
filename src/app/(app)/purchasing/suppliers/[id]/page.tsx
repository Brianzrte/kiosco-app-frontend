import { SupplierDetailView } from "@/components/suppliers/SupplierDetailView";
import { requireRole } from "@/lib/roles";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "inventory"]);
  const { id } = await params;
  return <SupplierDetailView id={id} />;
}
