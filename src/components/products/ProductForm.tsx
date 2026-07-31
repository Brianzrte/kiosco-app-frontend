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

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    category_id: product?.category_id ?? "",
    price: product?.price ?? "",
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConflict(false);
    setPending(true);
    const payload = { ...form, barcode: form.barcode.trim() || undefined };
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
      <form onSubmit={submit} className="flex flex-col gap-4">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Precio"
            inputMode="decimal"
            pattern="\d+(\.\d{1,2})?"
            placeholder="0.00"
            title="Número con hasta dos decimales, p. ej. 1250.50"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            required
          />
          <Input
            label="Costo"
            inputMode="decimal"
            pattern="\d+(\.\d{1,2})?"
            placeholder="0.00"
            title="Número con hasta dos decimales, p. ej. 980.00"
            value={form.cost}
            onChange={(e) => set("cost", e.target.value)}
            required
          />
        </div>
        {error && (
          <p
            className="text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex gap-3">
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
