"use client";

import { FormEvent, useCallback, useState } from "react";
import { pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Category, ProductList } from "@/lib/types";

const swatches: Record<string, string> = {
  "pastel-pink": "bg-pastel-pink",
  "pastel-peach": "bg-pastel-peach",
  "pastel-yellow": "bg-pastel-yellow",
  "pastel-green": "bg-pastel-green",
  "pastel-blue": "bg-pastel-blue",
};

export function CategoriesView() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fetcher = useCallback(
    () =>
      Promise.all([
        api<Category[]>("/categories").then((cats) => cats ?? []),
        api<ProductList>("/products").then((list) => list.products),
      ]),
    [],
  );
  const { data, error, reload } = useLoad(fetcher);
  const categories = data?.[0] ?? null;
  const productCount = new Map<string, number>();
  for (const p of data?.[1] ?? []) {
    productCount.set(p.category_id, (productCount.get(p.category_id) ?? 0) + 1);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await api("/categories", { method: "POST", body: { name: name.trim() } });
      toast("success", "Categoría creada");
      setName("");
      reload();
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Categorías</h1>

      <Card className="max-w-xl">
        <form onSubmit={create} className="flex items-end gap-3">
          <Input
            label="Nueva categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bebidas, golosinas…"
            required
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim()} pending={pending}>
            {pending ? "Creando…" : "Crear categoría"}
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-error">{formError}</p>}
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : categories === null ? (
        <ListSkeleton rows={4} />
      ) : categories.length === 0 ? (
        <EmptyState message="Todavía no hay categorías. Creá la primera para organizar los productos." />
      ) : (
        <ul className="max-w-xl overflow-hidden rounded-app border border-border bg-surface shadow-soft">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span
                aria-hidden
                className={`size-3 shrink-0 rounded-full ${swatches[pastelFor(c.id)]}`}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {c.name}
              </span>
              <span className="num text-sm text-text-secondary">
                {productCount.get(c.id) ?? 0}{" "}
                {(productCount.get(c.id) ?? 0) === 1 ? "producto" : "productos"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
