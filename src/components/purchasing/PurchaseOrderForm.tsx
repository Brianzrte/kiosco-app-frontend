"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigationRouter } from "@/components/shell/useNavigationRouter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconInfoCircle } from "@/components/ui/icons";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import {
  buildLastPurchaseOrderQuery,
  derivePurchaseOrderPreloadDraft,
  PurchaseOrderPreloadDraft,
  purchaseOrderPreloadExclusionReasonLabel,
  isValidPurchaseQuantity,
  summarizePurchaseOrderDraft,
  toOrderedAtPayload,
} from "@/lib/purchasing";
import { formatMoney } from "@/lib/money";
import {
  ProductList,
  PurchaseOrder,
  PurchaseOrdersList,
  ReplenishmentSuggestionsList,
  Supplier,
  SuppliersList,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import {
  DraftItem,
  PurchaseOrderItemRow,
} from "@/components/purchasing/PurchaseOrderItemRow";
import { ReplenishmentSuggestionsPanel } from "@/components/purchasing/ReplenishmentSuggestionsPanel";
import { PurchaseOrderConfirmationModal } from "@/components/purchasing/PurchaseOrderConfirmationModal";

let itemIdCounter = 0;
function nextItemId(): string {
  itemIdCounter += 1;
  return `item-${itemIdCounter}`;
}

function emptyDraftItem(): DraftItem {
  return { id: nextItemId(), productId: "", quantity: "1", unitCost: "" };
}

type PreloadStatus = "idle" | "loading" | "loaded" | "empty" | "error";

export function PurchaseOrderForm() {
  const router = useNavigationRouter();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [orderedAt, setOrderedAt] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyDraftItem()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const addProductButtonRef = useRef<HTMLButtonElement>(null);
  const itemRemoveButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const preloadRequestRef = useRef(0);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>("idle");
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [preloadSourceOrder, setPreloadSourceOrder] =
    useState<PurchaseOrder | null>(null);
  const [preloadDraft, setPreloadDraft] =
    useState<PurchaseOrderPreloadDraft | null>(null);

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<SuppliersList>("/suppliers").then((result) => result.suppliers),
        api<ProductList>("/products?limit=100").then(
          (result) => result.products,
        ),
      ]),
    [],
  );
  const { data, error } = useLoad(fetcher);
  const suggestionsFetcher = useCallback(
    () => api<ReplenishmentSuggestionsList>("/purchase-orders/suggestions"),
    [],
  );
  const { data: suggestions } = useLoad(suggestionsFetcher);

  const runPreload = useCallback(
    async (targetSupplierId: string) => {
      if (!data) return;
      const requestId = preloadRequestRef.current + 1;
      preloadRequestRef.current = requestId;
      const [, catalogProducts] = data;
      setPreloadStatus("loading");
      setPreloadError(null);
      try {
        const query = buildLastPurchaseOrderQuery(targetSupplierId);
        const list = await api<PurchaseOrdersList>(`/purchase-orders?${query}`);
        const [lastOrderSummary] = list.purchase_orders;
        if (requestId !== preloadRequestRef.current) return;
        if (!lastOrderSummary) {
          setPreloadStatus("empty");
          setPreloadSourceOrder(null);
          setPreloadDraft(null);
          return;
        }
        const order = await api<PurchaseOrder>(
          `/purchase-orders/${lastOrderSummary.id}`,
        );
        if (requestId !== preloadRequestRef.current) return;
        const draft = derivePurchaseOrderPreloadDraft(order, catalogProducts);
        setPreloadSourceOrder(order);
        setPreloadDraft(draft);
        setPreloadStatus("loaded");
        setItems(
          draft.lines.length > 0
            ? draft.lines.map((line) => ({
                id: nextItemId(),
                productId: line.productId,
                quantity: line.quantity,
                unitCost: line.unitCost,
              }))
            : [emptyDraftItem()],
        );
      } catch (cause) {
        if (requestId !== preloadRequestRef.current) return;
        setPreloadStatus("error");
        setPreloadError((cause as ApiError).message);
      }
    },
    [data],
  );

  // Preload runs when a supplier is chosen or changed, but only while the
  // draft is still pristine (design.md, decision D3): replacing typed work
  // in silence would destroy it without confirmation.
  useEffect(() => {
    if (!supplierId || !data) return;
    const isPristine = itemsRef.current.every((item) => !item.productId);
    if (!isPristine) return;
    void runPreload(supplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, data]);

  function changeSupplier(nextSupplierId: string) {
    // A result for the previous supplier must never replace the current draft
    // while the new supplier's preload is still being requested.
    preloadRequestRef.current += 1;
    setSupplierId(nextSupplierId);
  }

  function updateItem(
    index: number,
    field: "productId" | "quantity" | "unitCost",
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeItem(index: number) {
    const nextItem = items[index + 1];
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    requestAnimationFrame(() => {
      if (nextItem) {
        itemRemoveButtonRefs.current[nextItem.id]?.focus();
      } else {
        addProductButtonRef.current?.focus();
      }
    });
  }

  function addSuggestion(productId: string, quantity: number | undefined) {
    const nextItem = {
      id: nextItemId(),
      productId,
      quantity: String(quantity ?? 1),
      unitCost: "",
    };
    setItems((current) =>
      current.length === 1 && !current[0].productId && !current[0].unitCost
        ? [nextItem]
        : [...current, nextItem],
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!supplierId || !orderedAt || items.length === 0) {
      setFormError("Completá proveedor, fecha y al menos un producto.");
      return;
    }
    if (
      items.some(
        (item) =>
          !item.productId ||
          !isValidPurchaseQuantity(item.quantity) ||
          !item.unitCost.trim(),
      )
    ) {
      setFormError(
        "Cada ítem necesita producto, cantidad válida y costo unitario.",
      );
      return;
    }

    setFormError(null);
    setConfirmOpen(true);
  }

  async function createOrder() {
    setPending(true);
    try {
      const order = await api<PurchaseOrder>("/purchase-orders", {
        method: "POST",
        body: {
          supplier_id: supplierId,
          ordered_at: toOrderedAtPayload(orderedAt),
          ...(expectedAt ? { expected_at: toOrderedAtPayload(expectedAt) } : {}),
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_cost: item.unitCost.trim(),
          })),
        },
      });
      toast("success", "Pedido creado");
      setConfirmOpen(false);
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
  const draftSummary = summarizePurchaseOrderDraft(
    items
      .filter((item) => item.productId && item.unitCost.trim())
      .map((item) => ({
        productId: item.productId,
        productName:
          products.find((product) => product.id === item.productId)?.name ??
          item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.trim(),
      })),
  );

  return (
    <Card className="max-w-4xl">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Proveedor"
            value={supplierId}
            onChange={(event) => changeSupplier(event.target.value)}
          >
            <option value="">Elegí un proveedor</option>
            {activeSuppliers.map((supplier: Supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha de creación"
            type="date"
            compact
            value={orderedAt}
            onChange={(event) => setOrderedAt(event.target.value)}
          />
          <div className="flex flex-col gap-1">
            <Input
              label="Fecha objetivo"
              type="date"
              compact
              value={expectedAt}
              onChange={(event) => setExpectedAt(event.target.value)}
              error={formError?.includes("fecha objetivo") ? formError : undefined}
            />
            <p className="text-xs text-text-secondary">Indicá cuándo esperás que llegue el pedido.</p>
            {orderedAt && expectedAt && expectedAt < orderedAt && (
              <p className="text-xs text-warning" role="status">La fecha objetivo es anterior a la fecha de creación. Podés continuar, pero el backend puede rechazarla.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-text-secondary">
              Productos
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {supplierId && items.some((item) => item.productId) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  pending={preloadStatus === "loading"}
                  onClick={() => runPreload(supplierId)}
                >
                  Traer el último pedido
                </Button>
              )}
              <Button
                ref={addProductButtonRef}
                type="button"
                variant="secondary"
                onClick={() =>
                  setItems((current) => [...current, emptyDraftItem()])
                }
              >
                + Agregar producto
              </Button>
            </div>
          </div>
          {preloadStatus === "loading" && (
            <p className="text-sm text-text-secondary" aria-live="polite">
              Buscando el último pedido a este proveedor…
            </p>
          )}
          {preloadStatus === "empty" && (
            <p
              className="rounded-app border border-border bg-surface-subtle p-3 text-sm text-text-secondary"
              aria-live="polite"
            >
              Es el primer pedido a este proveedor. Agregá los productos a mano.
            </p>
          )}
          {preloadStatus === "error" && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary"
              aria-live="polite"
            >
              <p>No pudimos traer el último pedido: {preloadError}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => supplierId && runPreload(supplierId)}
              >
                Reintentar
              </Button>
            </div>
          )}
          {preloadStatus === "loaded" && preloadSourceOrder && preloadDraft && (
            <div
              role="region"
              aria-live="polite"
              className="flex items-start gap-2.5 rounded-app border border-primary/30 bg-primary/6 p-3 text-sm text-text-primary"
            >
              <IconInfoCircle className="mt-0.5 size-[18px] shrink-0 text-primary" />
              <div className="flex flex-col gap-2">
                <p>
                  <strong>Precarga editable:</strong> estas líneas son las del
                  último pedido a {preloadSourceOrder.supplier_name} (
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "short",
                  }).format(new Date(preloadSourceOrder.ordered_at))}
                  ). Nada está confirmado — ajustá cantidades y costos, o quitá
                  lo que no corresponda.
                </p>
                {preloadDraft.exclusions.length > 0 && (
                  <ul className="list-disc pl-5">
                    {preloadDraft.exclusions.map((exclusion, index) => (
                      <li key={index}>
                        {exclusion.productName} —{" "}
                        {purchaseOrderPreloadExclusionReasonLabel(
                          exclusion.reason,
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {/* Real `<table>`, not a card per line: NewPurchaseOrder.dc.html
              (mockup) renders a dense table with one header row and ~40px
              inputs (user decision, 2026-08-04, overriding the looser card
              treatment written in an earlier pass of this same change). */}
          <div className="overflow-x-auto rounded-app border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="bg-surface-subtle p-2.5 px-3.5 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Producto
                  </th>
                  <th className="w-[92px] bg-surface-subtle p-2.5 px-3.5 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Cantidad
                  </th>
                  <th className="w-[110px] bg-surface-subtle p-2.5 px-3.5 text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Costo unit.
                  </th>
                  <th className="w-[100px] bg-surface-subtle p-2.5 px-3.5 text-right text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                    Subtotal
                  </th>
                  <th className="w-11 bg-surface-subtle p-2.5 px-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => (
                  <PurchaseOrderItemRow
                    key={item.id}
                    item={item}
                    products={products}
                    supplierId={supplierId}
                    disabledRemove={items.length === 1}
                    onUpdate={(field, value) => updateItem(index, field, value)}
                    onRemove={() => removeItem(index)}
                    removeButtonRef={(el) => {
                      itemRemoveButtonRefs.current[item.id] = el;
                    }}
                    toast={toast}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ReplenishmentSuggestionsPanel
          suggestions={suggestions}
          onAddSuggestion={addSuggestion}
        />
        {formError && !confirmOpen && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-base font-bold text-text-primary">
            Total:{" "}
            <span className="num">{formatMoney(draftSummary.total)}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => router.push("/purchasing")}
            >
              Cancelar
            </Button>
            <Button ref={submitButtonRef} type="submit" pending={pending}>
              Crear pedido
            </Button>
          </div>
        </div>
      </form>
      <PurchaseOrderConfirmationModal
        open={confirmOpen}
        items={items}
        products={products}
        pending={pending}
        error={formError}
        onConfirm={createOrder}
        onClose={() => {
          if (pending) return;
          setFormError(null);
          setConfirmOpen(false);
          submitButtonRef.current?.focus();
        }}
      />
    </Card>
  );
}
