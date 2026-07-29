"use client";
import { FormEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Input";
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

function loadProducts(search: string) {
  return search.trim()
    ? api<{ products: Product[] }>(productSearchPath(search)).then(
        ({ products }) => products,
      )
    : Promise.resolve<Product[]>([]);
}
export function AddPurchaseOrderItemForm({
  orderId,
  onAdded,
}: {
  orderId: string;
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
        Agregar ítem
      </Button>
      <Dialog
        open={open}
        title="Agregar ítem recibido"
        onClose={() => setOpen(false)}
        dismissible={!pending}
        className="!w-[560px] !max-w-[calc(100vw-2rem)]"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Select
            label="Modo"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ReceivingItemMode);
              setProductId("");
              setDescription("");
              setFieldErrors({});
            }}
          >
            <option value="catalog">Buscar en el catálogo</option>
            <option value="text">Describir el producto</option>
          </Select>
          {mode === "catalog" ? (
            <>
              <Input
                label="Buscar producto"
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
              {search.trim() && !productId && (
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
                        className={`w-full px-3.5 py-2.5 text-left text-sm hover:bg-surface-2 focus-visible:bg-primary-light ${index === activeIndex ? "bg-primary-light" : ""}`}
                        onClick={() => selectProduct(product)}
                      >
                        {product.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {productId && (
                <p className="text-sm text-text-secondary">
                  Producto seleccionado: {search}
                </p>
              )}
            </>
          ) : (
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
          )}
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
