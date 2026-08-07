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
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { AdminToolbar } from "@/components/ui/Workspace";
import { AdminListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { computePageSize, computeTotalPages } from "@/lib/pagination";
import { useLoad } from "@/lib/useLoad";
import { Category, CategoryList } from "@/lib/types";

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

  if (categories === null && !error) {
    return <AdminListSkeleton rows={4} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        description="Agrupan productos para filtrar en Productos, Inventario y el POS."
      />

      {categoryList && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Categorías"
            value={categoryList.total}
            variant="workspace"
          />
        </div>
      )}

      <AdminToolbar label="Crear categoría">
        <form onSubmit={create} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Nueva categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bebidas, golosinas…"
            required
            className="w-full flex-1"
          />
          <Button type="submit" disabled={!name.trim()} pending={pending}>
            {pending ? "Creando…" : "Crear categoría"}
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-error">{formError}</p>}
      </AdminToolbar>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : categories === null ? (
        <AdminListSkeleton rows={4} />
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
                <div className={`flex gap-3 ${editingId === c.id ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>
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
                  {editingId === c.id ? (
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                      <Button
                        variant="secondary"
                        onClick={cancelEditing}
                        disabled={editPending}
                        className="flex-1 sm:flex-none"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => saveEditing(c.id)}
                        pending={editPending}
                        className="flex-1 sm:flex-none"
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
