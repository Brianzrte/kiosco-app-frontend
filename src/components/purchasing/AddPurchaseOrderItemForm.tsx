"use client";
import { FormEvent, KeyboardEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { IconAlert, IconSearch, IconTextLines } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import {
  buildAddedItemPayload,
  productSearchPath,
  ReceivingItemMode,
} from "@/lib/receiving";
import { Product } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type FieldErrors = Partial<
  Record<"product" | "description" | "quantity" | "unitCost", string>
>;

const TABS: {
  mode: ReceivingItemMode;
  label: string;
  Icon: typeof IconSearch;
}[] = [
  { mode: "catalog", label: "Buscar en el catálogo", Icon: IconSearch },
  { mode: "text", label: "Describir el producto", Icon: IconTextLines },
];

function loadProducts(search: string) {
  return search.trim()
    ? api<{ products: Product[] }>(productSearchPath(search)).then(
        ({ products }) => products,
      )
    : Promise.resolve<Product[]>([]);
}
export function AddPurchaseOrderItemForm({
  orderId,
  context,
  onAdded,
}: {
  orderId: string;
  /** Short label for which order this item is being added to (design.md, task 9.2). */
  context?: string;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ReceivingItemMode>("catalog");
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const fetcher = useCallback(() => loadProducts(search), [search]);
  const { data: products } = useLoad(fetcher);
  const visibleProducts = (products ?? []).filter((product) =>
    product.name
      .toLocaleLowerCase("es-AR")
      .includes(search.toLocaleLowerCase("es-AR")),
  );

  function switchMode(next: ReceivingItemMode) {
    setMode(next);
    setProductId("");
    setDescription("");
    setFieldErrors({});
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = TABS.findIndex((tab) => tab.mode === mode);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + TABS.length) % TABS.length;
    switchMode(TABS[nextIndex].mode);
  }

  function selectProduct(product: Product) {
    setProductId(product.id);
    setSearch(product.name);
    setActiveIndex(-1);
    setFieldErrors((current) => ({ ...current, product: undefined }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextFieldErrors: FieldErrors = {};
    if (mode === "catalog" && !productId) {
      nextFieldErrors.product = "Seleccioná un producto del catálogo.";
    }
    if (mode === "text" && !description.trim()) {
      nextFieldErrors.description = "Ingresá una descripción.";
    }
    if (
      !quantity ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      nextFieldErrors.quantity = "Ingresá una cantidad entera mayor a cero.";
    }
    if (!unitCost.trim()) {
      nextFieldErrors.unitCost = "Ingresá el costo unitario.";
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError(null);
      return;
    }
    const payload = buildAddedItemPayload({
      mode,
      productId,
      description,
      quantity,
      unitCost,
    });
    if (!payload) return;
    setError(null);
    setPending(true);
    try {
      await api(`/purchase-orders/${orderId}/items`, {
        method: "POST",
        body: payload,
      });
      toast("success", "Ítem agregado");
      setOpen(false);
      setProductId("");
      setDescription("");
      setQuantity("");
      setUnitCost("");
      onAdded();
    } catch (cause) {
      setError((cause as ApiError).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Agregar ítem no pedido
      </Button>
      <Dialog
        open={open}
        title="Agregar ítem no pedido"
        onClose={() => setOpen(false)}
        dismissible={!pending}
        className="!w-[560px] !max-w-[calc(100vw-2rem)]"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {context && <p className="text-sm text-text-secondary">{context}</p>}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Cómo identificás el producto
            </p>
            <div
              role="tablist"
              aria-label="Modo de alta"
              className="grid grid-cols-2 gap-2 rounded-app bg-surface-hover p-1"
            >
              {TABS.map((tab) => {
                const selected = tab.mode === mode;
                return (
                  <button
                    key={tab.mode}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onKeyDown={onTabKeyDown}
                    onClick={() => switchMode(tab.mode)}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-tight px-4 py-3 text-sm transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      selected
                        ? "bg-surface font-bold text-text-primary shadow-soft"
                        : "bg-transparent font-semibold text-text-secondary hover:bg-surface/50"
                    }`}
                  >
                    <tab.Icon className="size-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div role="tabpanel">
            {mode === "catalog" ? (
              <div className="flex flex-col gap-2">
                <Input
                  label="Buscar producto"
                  placeholder="Buscá por nombre o código de barras…"
                  icon={<IconSearch className="size-4" />}
                  value={search}
                  error={fieldErrors.product}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setProductId("");
                    setActiveIndex(-1);
                    setFieldErrors((current) => ({
                      ...current,
                      product: undefined,
                    }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveIndex((index) =>
                        Math.min(index + 1, visibleProducts.length - 1),
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveIndex((index) => Math.max(index - 1, 0));
                    } else if (event.key === "Enter" && activeIndex >= 0) {
                      event.preventDefault();
                      selectProduct(visibleProducts[activeIndex]);
                    } else if (event.key === "Escape") {
                      setActiveIndex(-1);
                    }
                  }}
                />
                {search.trim() &&
                  !productId &&
                  (visibleProducts.length > 0 ? (
                    <ul
                      role="listbox"
                      aria-label="Resultados de productos"
                      className="max-h-48 overflow-y-auto rounded-app border border-border bg-surface shadow-soft"
                    >
                      {visibleProducts.map((product, index) => (
                        <li
                          key={product.id}
                          role="option"
                          aria-selected={index === activeIndex}
                        >
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-surface-2 focus-visible:bg-primary-light ${index === activeIndex ? "bg-primary-light" : ""}`}
                            onClick={() => selectProduct(product)}
                          >
                            <span className="min-w-0 truncate font-medium text-text-primary">
                              {product.name}
                            </span>
                            <span className="data shrink-0 text-xs text-text-secondary">
                              {product.sku}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      Ningún producto coincide con “{search.trim()}”. ¿No está
                      en el catálogo?{" "}
                      <button
                        type="button"
                        className="font-medium text-primary hover:text-primary-hover"
                        onClick={() => switchMode("text")}
                      >
                        Describilo como texto libre
                      </button>
                      .
                    </p>
                  ))}
                {productId && (
                  <p className="text-sm text-text-secondary">
                    Producto seleccionado: {search}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="flex items-start gap-2 rounded-app border border-warning/40 bg-warning/10 p-3 text-sm text-text-primary">
                  <IconAlert className="mt-0.5 size-[18px] shrink-0 text-warning" />
                  <span>
                    <strong>
                      Este ítem va a quedar “Pendiente de alta” en Catálogo.
                    </strong>{" "}
                    Vas a poder venderlo desde el pedido y el stock, pero un
                    Admin tiene que catalogarlo para que quede como producto
                    normal.
                  </span>
                </p>
                <Input
                  label="Descripción"
                  value={description}
                  error={fieldErrors.description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      description: undefined,
                    }));
                  }}
                />
              </div>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              error={fieldErrors.quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  quantity: undefined,
                }));
              }}
            />
            <Input
              label="Costo unitario"
              inputMode="decimal"
              value={unitCost}
              error={fieldErrors.unitCost}
              onChange={(e) => {
                setUnitCost(e.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  unitCost: undefined,
                }));
              }}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" pending={pending}>
              {pending ? "Agregando…" : "Agregar ítem"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
