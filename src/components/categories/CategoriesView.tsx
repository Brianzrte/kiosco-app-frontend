"use client";

import { FormEvent, useCallback, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Category } from "@/lib/types";

export function CategoriesView() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fetcher = useCallback(
    () => api<Category[]>("/categories").then((cats) => cats ?? []),
    [],
  );
  const { data: categories, error, reload } = useLoad(fetcher);

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
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? "Creando…" : "Crear categoría"}
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-error">{formError}</p>}
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : categories === null ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState message="Todavía no hay categorías. Creá la primera para organizar los productos." />
      ) : (
        <div className="flex max-w-xl flex-wrap gap-2">
          {categories.map((c) => (
            <Badge
              key={c.id}
              tone={pastelFor(c.id)}
              className="px-3 py-1 text-sm"
            >
              {c.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
