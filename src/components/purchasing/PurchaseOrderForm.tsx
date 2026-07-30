"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { Product, ProductList, PurchaseOrder, ReplenishmentSuggestionsList, Supplier, SuppliersList } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type DraftItem = { productId: string; quantity: string; unitCost: string };

export function PurchaseOrderForm() {
  const router = useRouter();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [orderedAt, setOrderedAt] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { productId: "", quantity: "1", unitCost: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<SuppliersList>("/suppliers").then((result) => result.suppliers),
        api<ProductList>("/products?limit=100").then((result) => result.products),
      ]),
    [],
  );
  const { data, error } = useLoad(fetcher);
  const suggestionsFetcher = useCallback(
    () => api<ReplenishmentSuggestionsList>("/purchase-orders/suggestions"),
    [],
  );
  const { data: suggestions } = useLoad(suggestionsFetcher);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addSuggestion(productId: string, quantity: number | undefined) {
    const nextItem = { productId, quantity: String(quantity ?? 1), unitCost: "" };
    setItems((current) =>
      current.length === 1 && !current[0].productId && !current[0].unitCost
        ? [nextItem]
        : [...current, nextItem],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supplierId || !orderedAt || items.length === 0) {
      setFormError("Completá proveedor, fecha y al menos un producto.");
      return;
    }
    if (
      items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          !item.unitCost.trim(),
      )
    ) {
      setFormError("Cada ítem necesita producto, cantidad entera y costo unitario.");
      return;
    }

    setFormError(null);
    setPending(true);
    try {
      const order = await api<PurchaseOrder>("/purchase-orders", {
        method: "POST",
        body: {
          supplier_id: supplierId,
          ordered_at: orderedAt,
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: Number(item.quantity),
            unit_cost: item.unitCost.trim(),
          })),
        },
      });
      toast("success", "Pedido creado");
      router.push(`/purchasing/${order.id}`);
      router.refresh();
    } catch (cause) {
      setFormError((cause as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  if (error) return <ErrorState error={error} />;
  if (!data) return <LoadingState />;

  const [suppliers, products] = data;
  const activeSuppliers = suppliers.filter((supplier) => supplier.active);

  return (
    <Card className="max-w-4xl">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Proveedor" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
            <option value="">Elegí un proveedor</option>
            {activeSuppliers.map((supplier: Supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </Select>
          <Input label="Fecha del pedido" type="date" value={orderedAt} onChange={(event) => setOrderedAt(event.target.value)} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-text-secondary">Productos</h2>
            <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { productId: "", quantity: "1", unitCost: "" }])}>
              Agregar producto
            </Button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-app border border-border p-4 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]">
              <Select label="Producto" value={item.productId} onChange={(event) => updateItem(index, "productId", event.target.value)}>
                <option value="">Elegí un producto</option>
                {products.map((product: Product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </Select>
              <Input label="Cantidad" type="number" min="1" inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} />
              <Input label="Costo unitario" inputMode="decimal" placeholder="0.00" value={item.unitCost} onChange={(event) => updateItem(index, "unitCost", event.target.value)} />
              <div className="flex items-end">
                <Button type="button" variant="ghost" disabled={items.length === 1} onClick={() => removeItem(index)}>Quitar</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-text-secondary">Sugerencias de reposición</h2>
          {!suggestions ? (
            <p className="text-sm text-text-secondary">Cargando sugerencias…</p>
          ) : suggestions.suggestions.length === 0 ? (
            <p className="text-sm text-text-secondary">No hay reposición sugerida en este momento.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-app border border-border">
              {suggestions.suggestions.map((suggestion) => (
                <li key={suggestion.product_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium text-text-primary">{suggestion.product_name}</p>
                    <p className="text-sm text-text-secondary">{suggestion.explanation}</p>
                  </div>
                  {suggestion.suggested_quantity ? (
                    <Button type="button" variant="secondary" onClick={() => addSuggestion(suggestion.product_id, suggestion.suggested_quantity)}>
                      Usar {suggestion.suggested_quantity}
                    </Button>
                  ) : (
                    <span className="text-sm text-text-secondary">Revisar datos</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-text-secondary">Completá proveedor y costo unitario antes de crear el pedido.</p>
        </div>
        {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" pending={pending}>Crear pedido</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => router.push("/purchasing")}>Cancelar</Button>
        </div>
      </form>
    </Card>
  );
}
