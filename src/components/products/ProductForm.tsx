"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { Category, Product } from "@/lib/types";

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    category_id: product?.category_id ?? "",
    price: product?.price ?? "",
    cost: product?.cost ?? "",
  });

  useEffect(() => {
    api<Category[]>("/categories")
      .then((cats) => setCategories(cats ?? []))
      .catch((e: ApiError) => setError(e.message));
  }, []);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const payload = { ...form, barcode: form.barcode.trim() || undefined };
    try {
      if (product) {
        await api(`/products/${product.id}`, { method: "PUT", body: payload });
        toast("success", "Producto actualizado");
      } else {
        await api("/products", { method: "POST", body: payload });
        toast("success", "Producto creado");
      }
      router.push("/products");
      router.refresh();
    } catch (e) {
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            required
          />
          <Input
            label="Código de barras (opcional)"
            value={form.barcode}
            onChange={(e) => set("barcode", e.target.value)}
          />
        </div>
        <Select
          label="Categoría"
          value={form.category_id}
          onChange={(e) => set("category_id", e.target.value)}
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
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
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
