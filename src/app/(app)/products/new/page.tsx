import { requireRole } from "@/lib/roles";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  await requireRole(["inventory", "admin"]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Crear producto</h1>
      <ProductForm />
    </div>
  );
}
