"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { canApplySkuSuggestion } from "@/lib/productSku";
import {
  computeMarginAmount,
  computePercentFromPrices,
  roundPriceToSuggestedAmount,
  computeSalePriceFromCost,
} from "@/lib/products";
import { formatMoney } from "@/lib/money";
import {
  Category,
  CategoryList,
  Product,
  ProductSkuSuggestion,
} from "@/lib/types";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skuSuggestionState, setSkuSuggestionState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [skuSuggestionError, setSkuSuggestionError] = useState<string | null>(
    null,
  );
  const [conflict, setConflict] = useState(false);
  const skuRequestId = useRef(0);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const skuManuallyEditedRef = useRef(Boolean(product));

  const initialSalePrice = product
    ? product.unit_type === "pesable"
      ? product.price_per_kg ?? ""
      : product.price ?? ""
    : "";
  const [marginPercent, setMarginPercent] = useState(() =>
    String(computePercentFromPrices(product?.cost ?? "", initialSalePrice) ?? 30),
  );
  const [priceSuggestionVisible, setPriceSuggestionVisible] = useState(false);

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    category_id: product?.category_id ?? "",
    unit_type: product ? product.unit_type ?? "unitario" : "",
    price: roundPriceToSuggestedAmount(product?.price ?? ""),
    price_per_kg: roundPriceToSuggestedAmount(product?.price_per_kg ?? ""),
    cost: product?.cost ?? "",
  });

  useEffect(() => {
    // limit=100: cubre el tamaño de kiosco hasta que exista paginación real
    // en este selector (add-frontend-users, sección 7.2).
    api<CategoryList>("/categories?limit=100")
      .then((res) => setCategories(res.categories))
      .catch((e: ApiError) => setError(e.message));
  }, []);

  useEffect(() => {
    if (conflict) skuInputRef.current?.focus();
  }, [conflict]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function activePriceField(unitType: string): "price" | "price_per_kg" {
    return unitType === "pesable" ? "price_per_kg" : "price";
  }

  function onCostChange(value: string) {
    const percent = marginPercent.trim() === "" ? Number.NaN : Number(marginPercent);
    const nextPrice = computeSalePriceFromCost(value, percent);
    setPriceSuggestionVisible(nextPrice !== null);
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      return nextPrice === null
        ? { ...current, cost: value }
        : { ...current, cost: value, [priceField]: nextPrice };
    });
  }

  function onCostBlur() {
    const price = form[activePriceField(form.unit_type)];
    const actualPercent = computePercentFromPrices(form.cost, price);
    if (actualPercent !== null && price !== "0") {
      setMarginPercent(String(actualPercent));
    }
  }

  function onMarginPercentChange(value: string) {
    setMarginPercent(value);
    const percent = value.trim() === "" ? Number.NaN : Number(value);
    const nextPrice = computeSalePriceFromCost(form.cost, percent);
    setPriceSuggestionVisible(nextPrice !== null);
    if (nextPrice !== null && nextPrice !== "0") {
      const actualPercent = computePercentFromPrices(form.cost, nextPrice);
      if (actualPercent !== null) setMarginPercent(String(actualPercent));
    }
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      return nextPrice === null ? current : { ...current, [priceField]: nextPrice };
    });
  }

  function onPriceChange(value: string) {
    setPriceSuggestionVisible(false);
    setForm((current) => {
      const priceField = activePriceField(current.unit_type);
      const nextPercent = computePercentFromPrices(current.cost, value);
      if (nextPercent === null) return { ...current, [priceField]: value };
      setMarginPercent(String(nextPercent));
      return { ...current, [priceField]: value };
    });
  }

  function onSkuChange(value: string) {
    set("sku", value);
    skuManuallyEditedRef.current = true;
    setSkuSuggestionError(null);
  }

  function onCategoryChange(categoryId: string) {
    set("category_id", categoryId);
    setSkuSuggestionError(null);
    skuRequestId.current += 1;
    const requestId = skuRequestId.current;

    if (!categoryId || product) {
      setSkuSuggestionState("idle");
      return;
    }

    setSkuSuggestionState("loading");
    api<ProductSkuSuggestion>(
      `/products/sku-suggestion?category_id=${encodeURIComponent(categoryId)}`,
    )
      .then(({ sku }) => {
        if (requestId !== skuRequestId.current) return;
        if (!canApplySkuSuggestion(skuManuallyEditedRef.current)) {
          setSkuSuggestionState("idle");
          return;
        }
        setForm((current) => ({ ...current, sku }));
        skuManuallyEditedRef.current = false;
        setSkuSuggestionState("success");
      })
      .catch((e: ApiError) => {
        if (requestId !== skuRequestId.current) return;
        setSkuSuggestionState("error");
        setSkuSuggestionError(e.message);
      });
  }

  const priceField = activePriceField(form.unit_type);
  const activePrice = form[priceField];
  const marginAmount = computeMarginAmount(form.cost, activePrice);
  const marginPercentValue = computePercentFromPrices(form.cost, activePrice);
  const marginText =
    marginAmount !== null && marginPercentValue !== null
      ? `Margen: ${formatMoney(marginAmount)} (${marginPercentValue}%)`
      : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConflict(false);
    setPending(true);
    const payload = {
      ...form,
      price: form.unit_type === "pesable" ? "0.00" : form.price,
      price_per_kg:
        form.unit_type === "pesable" ? form.price_per_kg : undefined,
      barcode: form.barcode.trim() || undefined,
    };
    try {
      if (product) {
        await api(`/products/${product.id}`, { method: "PUT", body: payload });
        toast("success", "Producto actualizado");
      } else {
        const created = await api<Product>("/products", {
          method: "POST",
          body: payload,
        });
        toast("success", `Producto creado · SKU efectivo: ${created.sku}`);
      }
      router.push("/products");
      router.refresh();
    } catch (e) {
      setConflict((e as ApiError).status === 409);
      setError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-8">
        <section aria-labelledby="product-information-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="product-information-heading" className="text-base font-semibold">
              Datos del producto
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Identificá el producto y asociá su categoría.
            </p>
          </div>
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            autoFocus
          />
          <Select
            label="Categoría"
            value={form.category_id}
            onChange={(e) => onCategoryChange(e.target.value)}
            required
          >
            <option value="" disabled>
              Elegí una categoría
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {!product && (
            <div
              id="product-sku-help"
              className="-mt-2 text-sm text-text-secondary"
              aria-live="polite"
              role="status"
            >
              {skuSuggestionState === "loading" && "Buscando una propuesta de SKU…"}
              {skuSuggestionState === "success" &&
                "Propuesta automática. Se asigna al crear el producto."}
              {skuSuggestionState === "error" &&
                `No se pudo obtener una propuesta. ${skuSuggestionError ?? "El backend intentará generarlo al crear el producto."}`}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="SKU (automático)"
              id="product-sku"
              ref={skuInputRef}
              value={form.sku}
              onChange={(e) => onSkuChange(e.target.value)}
              aria-describedby="product-sku-help"
              readOnly
              aria-readonly="true"
              title="El SKU se asigna automáticamente"
            />
            <Input
              label="Código de barras (opcional)"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
            />
          </div>
        </section>

        <section aria-labelledby="product-pricing-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="product-pricing-heading" className="text-base font-semibold">
              Precio y margen
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Definí el costo y la ganancia para calcular el precio de venta.
            </p>
          </div>
          <Select
            label="Tipo de producto"
            value={form.unit_type}
            onChange={(e) => set("unit_type", e.target.value)}
            required
          >
            <option value="" disabled>
              Elegí un tipo
            </option>
            <option value="unitario">Unitario</option>
            <option value="pesable">Pesable (por kg)</option>
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input
              className="sm:col-span-3"
              label="Costo"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              placeholder="0.00"
              title="Número con hasta dos decimales, p. ej. 980.00"
              value={form.cost}
              onChange={(e) => onCostChange(e.target.value)}
              onBlur={onCostBlur}
              required
            />
            <Input
              className="sm:col-span-1"
              label="% de ganancia"
              inputMode="decimal"
              pattern="-?\d+(\.\d{1})?"
              placeholder="30"
              title="Número con hasta un decimal, p. ej. 30"
              value={marginPercent}
              onChange={(e) => onMarginPercentChange(e.target.value)}
            />
            <div className="sm:col-span-3">
              <Input
                label={form.unit_type === "pesable" ? "Precio por kilo" : "Precio de venta"}
                id="product-sale-price"
                inputMode="numeric"
                pattern="\d+"
                placeholder="0"
                title="Número entero en pesos, p. ej. 1251"
                value={form.unit_type === "pesable" ? form.price_per_kg : form.price}
                onChange={(e) => onPriceChange(e.target.value)}
                aria-describedby={marginText ? "product-price-margin" : undefined}
                required
              />
              {priceSuggestionVisible && (
                <p className="mt-1.5 text-sm text-text-secondary">
                  Precio sugerido
                </p>
              )}
              {marginText && (
                <p
                  id="product-price-margin"
                  className="mt-1.5 text-sm text-text-secondary"
                  aria-live="polite"
                  role="status"
                >
                  {marginText}
                </p>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p
            className="text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Button type="submit" pending={pending}>
            {pending
              ? "Guardando…"
              : product
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/products")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
