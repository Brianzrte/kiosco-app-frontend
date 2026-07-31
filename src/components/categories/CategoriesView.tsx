"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { computePageSize, computeTotalPages } from "@/lib/pagination";
import { useLoad } from "@/lib/useLoad";
import { Category, CategoryList, ProductList } from "@/lib/types";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [page, setPage] = useState(1);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [pageSize, setPageSize] = useState(15);
  const desktopListRef = useRef<HTMLUListElement>(null);

  const categoriesFetcher = useCallback(
    () => api<CategoryList>(`/categories?limit=${pageSize}&page=${page}`),
    [page, pageSize],
  );
  const { data: categoryList, error, reload } = useLoad(categoriesFetcher);
  const categories = categoryList?.categories ?? null;
  const totalPages = categoryList
    ? computeTotalPages(categoryList.total, pageSize)
    : 1;

  useEffect(() => {
    if (!categoryList || categoryList.categories.length === 0) return;
    const recompute = () => {
      const rect = desktopListRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = computePageSize({ viewportHeight: window.innerHeight, listTop: rect.top, rowHeight: rect.height / categoryList.categories.length, reservedBelow: 56, min: 5, max: 15, fallback: 15 });
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [categoryList, pageSize]);

  // Sólo alimenta el contador de productos por categoría; no participa de la
  // paginación de la lista de categorías.
  const productsFetcher = useCallback(
    () => api<ProductList>("/products?limit=100").then((list) => list.products),
    [],
  );
  const { data: products } = useLoad(productsFetcher);
  const productCount = new Map<string, number>();
  for (const p of products ?? []) {
    productCount.set(p.category_id, (productCount.get(p.category_id) ?? 0) + 1);
  }

  useEffect(() => {
    if (!editingId) return;
    const frame = requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await api("/categories", { method: "POST", body: { name: name.trim() } });
      toast("success", "Categoría creada");
      setName("");
      setPage(1);
      reload();
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditError(null);
  }

  function cancelEditing() {
    if (editPending) return;
    setEditingId(null);
    setEditingName("");
    setEditError(null);
  }

  async function saveEditing(categoryId: string) {
    setEditError(null);
    setEditPending(true);
    try {
      await api<Category>(`/categories/${categoryId}`, {
        method: "PUT",
        body: { name: editingName.trim() },
      });
      toast("success", "Categoría actualizada");
      setEditingId(null);
      setEditingName("");
      reload();
    } catch (error) {
      setEditError((error as ApiError).message);
      editInputRef.current?.focus();
    } finally {
      setEditPending(false);
    }
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    categoryId: string,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!editPending) saveEditing(categoryId);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        description="Agrupan productos para filtrar en Productos, Inventario y el POS."
      />

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
        <>
          <ul ref={desktopListRef} className="max-w-xl overflow-hidden rounded-app border border-border bg-surface shadow-soft">
            {categories.map((c) => (
              <li
                key={c.id}
                className="border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`size-3 shrink-0 rounded-full ${swatches[pastelFor(c.id)]}`}
                  />
                  {editingId === c.id ? (
                    <div className="min-w-0 flex-1">
                      <Input
                        ref={editInputRef}
                        aria-label={`Renombrar ${c.name}`}
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => handleEditKeyDown(event, c.id)}
                        error={editError ?? undefined}
                        disabled={editPending}
                      />
                    </div>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {c.name}
                    </span>
                  )}
                  <span className="num shrink-0 text-sm text-text-secondary">
                    {productCount.get(c.id) ?? 0}{" "}
                    {(productCount.get(c.id) ?? 0) === 1
                      ? "producto"
                      : "productos"}
                  </span>
                  {editingId === c.id ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        onClick={cancelEditing}
                        disabled={editPending}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => saveEditing(c.id)}
                        pending={editPending}
                      >
                        {editPending ? "Guardando…" : "Guardar"}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => startEditing(c)}>
                      Renombrar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex max-w-xl items-center justify-between gap-3 text-sm text-text-secondary">
              <span>
                Página {page} de {totalPages} · {categoryList?.total} categorías
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
