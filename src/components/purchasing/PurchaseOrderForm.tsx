"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { IconAlert, IconSearch, IconTrash } from "@/components/ui/icons";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { computeTotalPages, pageWindow } from "@/lib/pagination";
import {
  appendSupplierAssociation,
  filterIncompleteDataSuggestions,
  hasSupplierAssociation,
  splitReplenishmentSuggestions,
  summarizePurchaseOrderDraft,
  toOrderedAtPayload,
} from "@/lib/purchasing";
import {
  Product,
  ProductList,
  ProductSuppliersList,
  PurchaseOrder,
  ReplenishmentSuggestion,
  ReplenishmentSuggestionsList,
  Supplier,
  SuppliersList,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type DraftItem = {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
};

let itemIdCounter = 0;
function nextItemId(): string {
  itemIdCounter += 1;
  return `item-${itemIdCounter}`;
}

export function PurchaseOrderForm() {
  const router = useRouter();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [orderedAt, setOrderedAt] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { id: nextItemId(), productId: "", quantity: "1", unitCost: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [incompleteSearchOpen, setIncompleteSearchOpen] = useState(false);
  const [incompleteSearchTerm, setIncompleteSearchTerm] = useState("");
  const [incompletePage, setIncompletePage] = useState(1);
  const incompleteSearchInputRef = useRef<HTMLInputElement>(null);
  const incompleteSearchButtonRef = useRef<HTMLButtonElement>(null);

  function openIncompleteSearch() {
    setIncompleteSearchOpen(true);
    requestAnimationFrame(() => incompleteSearchInputRef.current?.focus());
  }

  function closeIncompleteSearch() {
    setIncompleteSearchOpen(false);
    setIncompleteSearchTerm("");
  }

  function toggleIncompleteSearch() {
    if (incompleteSearchOpen) {
      closeIncompleteSearch();
      incompleteSearchButtonRef.current?.focus();
    } else {
      openIncompleteSearch();
    }
  }

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
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
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
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          !item.unitCost.trim(),
      )
    ) {
      setFormError(
        "Cada ítem necesita producto, cantidad entera y costo unitario.",
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
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: Number(item.quantity),
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
  const { lowStock, incompleteData } = suggestions
    ? splitReplenishmentSuggestions(suggestions.suggestions)
    : { lowStock: [], incompleteData: [] };

  return (
    <Card className="max-w-4xl">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Proveedor"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Elegí un proveedor</option>
            {activeSuppliers.map((supplier: Supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha del pedido"
            type="date"
            compact
            value={orderedAt}
            onChange={(event) => setOrderedAt(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-text-secondary">
              Productos
            </h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    id: nextItemId(),
                    productId: "",
                    quantity: "1",
                    unitCost: "",
                  },
                ])
              }
            >
              Agregar producto
            </Button>
          </div>
          {items.map((item, index) => (
            <PurchaseOrderItemRow
              key={item.id}
              item={item}
              products={products}
              supplierId={supplierId}
              disabledRemove={items.length === 1}
              onUpdate={(field, value) => updateItem(index, field, value)}
              onRemove={() => removeItem(index)}
              toast={toast}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-text-secondary">
            Sugerencias de reposición
          </h2>
          {!suggestions ? (
            <p className="text-sm text-text-secondary">Cargando sugerencias…</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-text-primary">
                    Bajos de stock
                  </h3>
                  <Badge tone="success">Reponer ahora</Badge>
                </div>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-text-secondary">
                    No hay productos bajos de stock en este momento.
                  </p>
                ) : (
                  <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-app border border-border">
                    {lowStock.map((suggestion) => (
                      <li
                        key={suggestion.product_id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-medium text-text-primary"
                            title={suggestion.product_name}
                          >
                            {suggestion.product_name}
                          </p>
                          <p
                            className="truncate text-sm text-text-secondary"
                            title={suggestion.explanation}
                          >
                            {suggestion.explanation}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          onClick={() =>
                            addSuggestion(
                              suggestion.product_id,
                              suggestion.suggested_quantity,
                            )
                          }
                        >
                          Usar {suggestion.suggested_quantity}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-text-primary">
                    Datos de planificación incompletos
                  </h3>
                  <Badge tone="neutral">Completar datos</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <div
                      className={`overflow-hidden transition-[width,opacity] duration-[var(--motion-base)] ease-[var(--ease-standard)] ${
                        incompleteSearchOpen
                          ? "w-40 opacity-100 sm:w-56"
                          : "w-0 opacity-0"
                      }`}
                    >
                      <label
                        htmlFor="incomplete-data-search"
                        className="sr-only"
                      >
                        Buscar en datos de planificación incompletos
                      </label>
                      <input
                        id="incomplete-data-search"
                        ref={incompleteSearchInputRef}
                        value={incompleteSearchTerm}
                        onChange={(event) => {
                          setIncompleteSearchTerm(event.target.value);
                          setIncompletePage(1);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            closeIncompleteSearch();
                            incompleteSearchButtonRef.current?.focus();
                          }
                        }}
                        onBlur={() => {
                          if (!incompleteSearchTerm.trim()) {
                            setIncompleteSearchOpen(false);
                          }
                        }}
                        placeholder="Buscar producto…"
                        autoComplete="off"
                        tabIndex={incompleteSearchOpen ? 0 : -1}
                        className="w-full rounded-app border border-border bg-surface px-3 py-1.5 text-sm shadow-soft placeholder:text-text-disabled focus:border-primary"
                      />
                    </div>
                    <button
                      ref={incompleteSearchButtonRef}
                      type="button"
                      aria-label="Buscar en datos de planificación incompletos"
                      aria-expanded={incompleteSearchOpen}
                      onClick={toggleIncompleteSearch}
                      className="flex size-8 shrink-0 items-center justify-center rounded-app text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover hover:text-text-primary"
                    >
                      <IconSearch className="size-4" />
                    </button>
                  </div>
                </div>
                {(() => {
                  const visibleIncompleteData =
                    incompleteSearchOpen && incompleteSearchTerm.trim()
                      ? filterIncompleteDataSuggestions(
                          incompleteData,
                          incompleteSearchTerm,
                        )
                      : incompleteData;
                  if (incompleteData.length === 0) {
                    return (
                      <p className="text-sm text-text-secondary">
                        No hay productos con datos de planificación incompletos.
                      </p>
                    );
                  }
                  if (visibleIncompleteData.length === 0) {
                    return (
                      <p className="text-sm text-text-secondary">
                        Ningún producto con datos incompletos coincide con “
                        {incompleteSearchTerm.trim()}”.
                      </p>
                    );
                  }
                  const pageSize = 20;
                  const totalPages = computeTotalPages(visibleIncompleteData.length, pageSize);
                  return (
                    <>
                    <ul className="divide-y divide-border rounded-app border border-border">
                      {pageWindow(visibleIncompleteData, incompletePage, pageSize).map((suggestion) => (
                        <IncompleteDataSuggestionItem
                          key={suggestion.product_id}
                          suggestion={suggestion}
                          onConfirm={addSuggestion}
                        />
                      ))}
                    </ul>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-text-secondary">Página {incompletePage} de {totalPages}</p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="secondary" disabled={incompletePage <= 1} onClick={() => setIncompletePage((value) => Math.max(1, value - 1))}>Anterior</Button>
                          <Button type="button" size="sm" variant="secondary" disabled={incompletePage >= totalPages} onClick={() => setIncompletePage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button>
                        </div>
                      </div>
                    )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          <p className="text-xs text-text-secondary">
            Completá proveedor y costo unitario antes de crear el pedido.
          </p>
        </div>
        {formError && !confirmOpen && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button ref={submitButtonRef} type="submit" pending={pending}>
            Crear pedido
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => router.push("/purchasing")}
          >
            Cancelar
          </Button>
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

function PurchaseOrderItemRow({
  item,
  products,
  supplierId,
  disabledRemove,
  onUpdate,
  onRemove,
  toast,
}: {
  item: DraftItem;
  products: Product[];
  supplierId: string;
  disabledRemove: boolean;
  onUpdate: (
    field: "productId" | "quantity" | "unitCost",
    value: string,
  ) => void;
  onRemove: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  return (
    <div className="grid gap-3 rounded-app border border-border p-4 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]">
      <ProductCombobox
        productId={item.productId}
        products={products}
        onSelect={(productId) => onUpdate("productId", productId)}
      />
      <Input
        label="Cantidad"
        type="number"
        min="1"
        inputMode="numeric"
        value={item.quantity}
        onChange={(event) => onUpdate("quantity", event.target.value)}
      />
      <Input
        label="Costo unitario"
        inputMode="decimal"
        placeholder="0.00"
        value={item.unitCost}
        onChange={(event) => onUpdate("unitCost", event.target.value)}
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          iconOnly
          aria-label="Quitar producto"
          title="Quitar producto"
          disabled={disabledRemove}
          onClick={onRemove}
        >
          <IconTrash className="size-4" />
        </Button>
      </div>
      {supplierId && item.productId && (
        <div className="md:col-span-4">
          {/* Remounted on productId/supplierId change so each product change
              starts a fresh check and discards any in-flight or stale result
              from a previously selected product (design.md decision 5). */}
          <SupplierAssociationCheck
            key={`${item.productId}:${supplierId}`}
            productId={item.productId}
            supplierId={supplierId}
            toast={toast}
          />
        </div>
      )}
    </div>
  );
}

// Reuses the same accessible combobox pattern already implemented in the
// POS product search (PosView.tsx): role="combobox", aria-expanded,
// aria-controls, aria-activedescendant, options with role="option", client-
// side filtering with useMemo and keyboard navigation (design.md, decision
// 10). The initial displayed text is derived once from the item's current
// productId (set on mount only) because the only path that changes an
// existing row's productId afterwards is this same combobox calling
// onSelect, so no external re-sync is needed while the row stays mounted.
function ProductCombobox({
  productId,
  products,
  onSelect,
}: {
  productId: string;
  products: Product[];
  onSelect: (productId: string) => void;
}) {
  const listId = useId();
  const selectedProduct = products.find((product) => product.id === productId);
  const [text, setText] = useState(selectedProduct?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const term = text.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((product) => product.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, text]);

  function pick(product: Product) {
    setText(product.name);
    setOpen(false);
    onSelect(product.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) pick(target);
    }
  }

  const showResults = open && text.trim().length > 0;

  return (
    <div className="relative">
      <label
        htmlFor={listId}
        className="mb-1.5 block text-sm font-medium text-text-secondary"
      >
        Producto
      </label>
      <input
        id={listId}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setActiveIndex(0);
          setOpen(true);
          if (event.target.value.trim() === "" && productId) onSelect("");
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (text.trim()) setOpen(true);
        }}
        role="combobox"
        aria-expanded={showResults}
        aria-controls={`${listId}-results`}
        aria-activedescendant={
          results[activeIndex]
            ? `${listId}-result-${results[activeIndex].id}`
            : undefined
        }
        autoComplete="off"
        placeholder="Buscá un producto…"
        className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm shadow-soft placeholder:text-text-disabled hover:border-border-hover focus:border-primary"
      />
      {showResults && (
        <ul
          id={`${listId}-results`}
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-app border border-border bg-surface shadow-soft"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-secondary">
              Ningún producto coincide con “{text.trim()}”.
            </li>
          ) : (
            results.map((product, index) => (
              <li
                key={product.id}
                id={`${listId}-result-${product.id}`}
                role="option"
                aria-selected={index === activeIndex}
                className="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(product)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover ${
                    index === activeIndex ? "bg-surface-hover" : ""
                  }`}
                >
                  <span className="min-w-0 truncate font-medium text-text-primary">
                    {product.name}
                  </span>
                  <span className="data shrink-0 text-xs text-text-secondary">
                    {product.sku}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function SupplierAssociationCheck({
  productId,
  supplierId,
  toast,
}: {
  productId: string;
  supplierId: string;
  toast: ReturnType<typeof useToast>;
}) {
  const fetcher = useCallback(
    () => api<ProductSuppliersList>(`/products/${productId}/suppliers`),
    [productId],
  );
  const { data, error, reload } = useLoad(fetcher);
  const [associating, setAssociating] = useState(false);
  const [associateError, setAssociateError] = useState<string | null>(null);
  const [associated, setAssociated] = useState(false);

  if (error) {
    return (
      <div>
        <p className="flex items-center gap-2 text-sm text-error">
          <IconAlert className="size-4 shrink-0" />
          No se pudo verificar la asociación con el proveedor: {error.message}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={reload}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  // Loading ("verificando asociación"): render nothing so no warning or its
  // absence flashes while the check is in flight (design.md, UI states).
  if (!data) return null;

  if (associated || hasSupplierAssociation(data.suppliers, supplierId)) {
    return null;
  }

  async function associate() {
    setAssociating(true);
    setAssociateError(null);
    try {
      const current = await api<ProductSuppliersList>(
        `/products/${productId}/suppliers`,
      );
      const payload = appendSupplierAssociation(current.suppliers, supplierId);
      await api<ProductSuppliersList>(`/products/${productId}/suppliers`, {
        method: "PUT",
        body: payload,
      });
      setAssociated(true);
      toast("success", "Proveedor asociado al producto");
    } catch (cause) {
      setAssociateError((cause as ApiError).message);
    } finally {
      setAssociating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-app border border-warning/40 bg-warning/10 p-3">
      <p className="flex items-center gap-2 text-sm text-text-primary">
        <IconAlert className="size-4 shrink-0 text-warning" />
        El producto seleccionado no está asociado a este proveedor, ¿desea
        asociarlo?
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          pending={associating}
          onClick={associate}
        >
          Asociar producto al proveedor
        </Button>
      </div>
      {associateError && <p className="text-sm text-error">{associateError}</p>}
    </div>
  );
}

function IncompleteDataSuggestionItem({
  suggestion,
  onConfirm,
}: {
  suggestion: ReplenishmentSuggestion;
  onConfirm: (productId: string, quantity: number) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [quantity, setQuantity] = useState("1");

  function handleCheckedChange(next: boolean) {
    setChecked(next);
    if (!next) setQuantity("1");
  }

  function confirm() {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1) return;
    onConfirm(suggestion.product_id, parsed);
    setChecked(false);
    setQuantity("1");
  }

  return (
    <li className="flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-text-primary">
            {suggestion.product_name}
          </p>
          <p className="text-sm text-text-secondary">
            {suggestion.explanation}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => handleCheckedChange(event.target.checked)}
            className="size-4 accent-primary"
          />
          Agregar al pedido
        </label>
      </div>
      {checked && (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Cantidad"
            type="number"
            min="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="max-w-32"
          />
          <Button type="button" size="sm" variant="secondary" onClick={confirm}>
            Agregar
          </Button>
        </div>
      )}
    </li>
  );
}

function PurchaseOrderConfirmationModal({
  open,
  items,
  products,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  items: DraftItem[];
  products: Product[];
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const summary = summarizePurchaseOrderDraft(
    items.map((item) => ({
      productId: item.productId,
      productName:
        products.find((product) => product.id === item.productId)?.name ??
        item.productId,
      quantity: Number(item.quantity),
      unitCost: item.unitCost.trim(),
    })),
  );

  return (
    <Dialog
      open={open}
      title="Confirmar pedido"
      onClose={onClose}
      dismissible={!pending}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Revisá los productos, cantidades y costos antes de crear el pedido.
        </p>
        <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-app border border-border">
          {summary.lines.map((line) => (
            <li
              key={line.productId}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {line.productName}
                </p>
                <p className="text-text-secondary">
                  {line.quantity} × {formatMoney(line.unitCost)}
                </p>
              </div>
              <p className="num font-medium text-text-primary">
                {formatMoney(line.subtotal)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <span className="font-medium text-text-primary">Total</span>
          <span className="num text-lg font-semibold text-text-primary">
            {formatMoney(summary.total)}
          </span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="button" pending={pending} onClick={onConfirm}>
            Confirmar pedido
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
