"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useRef,
  useState,
  useEffect,
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { ExpenseCategory } from "@/lib/types";
import { ExpensesContextualActions } from "@/components/expenses/ExpensesContextualActions";

/**
 * Rubros de gasto (bloque A, add-frontend-expenses-and-payroll). Modelada
 * sobre `CategoriesView.tsx` (categorías de producto): alta, renombrado y
 * archivado, sin borrado. `include_inactive=true` es necesario para que los
 * rubros archivados sigan visibles como referencia histórica — el backend los
 * excluye por default (verificado en vivo el 2026-08-06).
 */
export function ExpenseCategoriesView() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const renameButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [restoreFocusId, setRestoreFocusId] = useState<string | null>(null);

  const [archiving, setArchiving] = useState<ExpenseCategory | null>(null);
  const [archivePending, setArchivePending] = useState(false);

  const fetcher = useCallback(
    () =>
      api<{ items: ExpenseCategory[] }>(
        "/expense-categories?include_inactive=true",
      ),
    [],
  );
  const { data, error, reload } = useLoad(fetcher);
  const categories = data?.items ?? null;
  // Activos primero en el orden que llegan; archivados al final, igual que el
  // mockup (`design/03-rubros-*`).
  const sorted = categories
    ? [...categories].sort((a, b) => Number(b.active) - Number(a.active))
    : null;

  useEffect(() => {
    if (!editingId) return;
    const frame = requestAnimationFrame(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  // Devuelve el foco al botón "Renombrar" que abrió la edición cuando esta se
  // cierra (cancelada o guardada con éxito) — mismo criterio que el `Dialog`
  // de archivado, que restaura el foco al cerrarse. Al guardar, `saveEditing`
  // llama `reload()` en el mismo ciclo que `setEditingId(null)`: `useLoad`
  // pone `data` en `null` de forma síncrona, así que la lista salta al
  // skeleton en esa misma pasada y la fila (con su ref del botón) se
  // desmonta antes de que este efecto pueda enfocarla. Por eso el intento de
  // foco espera a que `categories` vuelva a estar disponible (no `null`):
  // recién ahí la lista real, con la fila montada de nuevo, existe en el DOM.
  useEffect(() => {
    if (editingId !== null || !restoreFocusId || categories === null) return;
    const idToFocus = restoreFocusId;
    const frame = requestAnimationFrame(() => {
      renameButtonRefs.current.get(idToFocus)?.focus();
      setRestoreFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId, restoreFocusId, categories]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      await api("/expense-categories", {
        method: "POST",
        body: { name: name.trim() },
      });
      toast("success", "Rubro creado");
      setName("");
      reload();
    } catch (e) {
      setFormError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  function startEditing(category: ExpenseCategory) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditError(null);
  }

  function cancelEditing() {
    if (editPending) return;
    setRestoreFocusId(editingId);
    setEditingId(null);
    setEditingName("");
    setEditError(null);
  }

  async function saveEditing(categoryId: string) {
    setEditError(null);
    setEditPending(true);
    try {
      await api<ExpenseCategory>(`/expense-categories/${categoryId}`, {
        method: "PUT",
        body: { name: editingName.trim() },
      });
      toast("success", "Rubro actualizado");
      setRestoreFocusId(categoryId);
      setEditingId(null);
      setEditingName("");
      reload();
    } catch (e) {
      setEditError((e as ApiError).message);
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

  async function archive() {
    if (!archiving) return;
    setArchivePending(true);
    try {
      await api(`/expense-categories/${archiving.id}/deactivate`, {
        method: "PATCH",
      });
      toast("success", "Rubro archivado");
      setArchiving(null);
      reload();
    } catch (e) {
      toast("error", (e as ApiError).message);
    } finally {
      setArchivePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rubros"
        description="En qué gastás. Un rubro archivado sigue rotulando egresos viejos, pero no se puede elegir en uno nuevo. No hay borrado."
        actions={<ExpensesContextualActions screen="categories" />}
      />

      <Card className="max-w-xl">
        <form onSubmit={create} className="flex items-end gap-3">
          <Input
            label="Nuevo rubro"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fletes, insumos de cocina…"
            required
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim()} pending={pending}>
            {pending ? "Creando…" : "Crear"}
          </Button>
        </form>
        {formError && <p className="mt-3 text-sm text-error">{formError}</p>}
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : sorted === null ? (
        <ListSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState message="Todavía no creaste ningún rubro. Un rubro agrupa tus egresos —por ejemplo Combustible o Alquiler— para saber en qué se va la plata del negocio." />
      ) : (
        <ul className="max-w-xl overflow-hidden rounded-app border border-border bg-surface shadow-soft">
          {sorted.map((c) => (
            <li
              key={c.id}
              className={`border-b border-border px-4 py-3 last:border-b-0 ${!c.active ? "opacity-60" : ""}`}
            >
              <div
                className={`flex gap-3 ${
                  editingId === c.id
                    ? "flex-col items-stretch sm:flex-row sm:items-center"
                    : "items-center"
                }`}
              >
                {editingId === c.id ? (
                  <div className="min-w-0 w-full flex-1">
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

                {!c.active ? (
                  <Badge tone="neutral">Archivado</Badge>
                ) : editingId === c.id ? (
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
                  <div className="flex shrink-0 gap-2">
                    <Button
                      ref={(el) => {
                        if (el) renameButtonRefs.current.set(c.id, el);
                        else renameButtonRefs.current.delete(c.id);
                      }}
                      variant="ghost"
                      onClick={() => startEditing(c)}
                    >
                      Renombrar
                    </Button>
                    <Button variant="ghost" onClick={() => setArchiving(c)}>
                      Archivar
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={archiving !== null}
        title="Archivar rubro"
        onClose={() => (archivePending ? null : setArchiving(null))}
        dismissible={!archivePending}
      >
        <p className="mb-6 text-sm text-text-secondary">
          El rubro “{archiving?.name}” deja de estar disponible para egresos
          nuevos. Los egresos ya cargados con este rubro lo siguen mostrando sin
          cambios. No hay una acción de borrado ni de reactivación desde esta
          pantalla.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setArchiving(null)}
            disabled={archivePending}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={archive} pending={archivePending}>
            {archivePending ? "Archivando…" : "Archivar"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
