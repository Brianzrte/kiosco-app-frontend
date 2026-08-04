import { PurchaseOrderForm } from "@/components/purchasing/PurchaseOrderForm";
import { requireRole } from "@/lib/roles";

export default async function NewPurchaseOrderPage() {
  await requireRole(["admin", "inventory"]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">Crear pedido</h1>
      <PurchaseOrderForm />
    </div>
  );
}
