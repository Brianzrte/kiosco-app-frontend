import { requireRole } from "@/lib/roles";
import { ProductDetail } from "@/components/products/ProductDetail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["inventory", "admin"]);
  const { id } = await params;
  return <ProductDetail id={id} role={session.role} />;
}
