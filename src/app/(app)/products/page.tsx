import { requireRole } from "@/lib/roles";
import { ProductsView } from "@/components/products/ProductsView";

export default async function ProductsPage() {
  await requireRole(["inventory", "admin"]);
  return <ProductsView />;
}
