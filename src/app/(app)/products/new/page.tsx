import { requireRole } from "@/lib/roles";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  await requireRole(["inventory_manager", "admin"]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Crear producto</h1>
      <ProductForm />
    </div>
  );
}
