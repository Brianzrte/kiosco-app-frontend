"use client";

import { FormEvent, useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import {
  ProductSupplier,
  ProductSuppliersList,
  Supplier,
  SuppliersList,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type DraftRelation = {
  supplierId: string;
  preferred: boolean;
  replenishmentFrequencyDays: string;
};

export function ProductSuppliersPanel({ productId }: { productId: string }) {
  const toast = useToast();
  const [draft, setDraft] = useState<DraftRelation[] | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const suppliersFetcher = useCallback(
    () => api<SuppliersList>("/suppliers"),
    [],
  );
  const relationsFetcher = useCallback(
    () => api<ProductSuppliersList>(`/products/${productId}/suppliers`),
    [productId],
  );
  const {
    data: suppliersData,
    error: suppliersError,
    reload: reloadSuppliers,
  } = useLoad(suppliersFetcher);
  const {
    data: relationsData,
    error: relationsError,
    reload: reloadRelations,
  } = useLoad(relationsFetcher);

  if (suppliersError || relationsError) {
    return (
      <Card>
        <ErrorState
          error={suppliersError ?? relationsError!}
          onRetry={() => {
            reloadSuppliers();
            reloadRelations();
          }}
        />
      </Card>
    );
  }
  if (!suppliersData || !relationsData) {
    return (
      <Card>
        <LoadingState label="Cargando proveedores del producto…" />
      </Card>
    );
  }

  const activeSuppliers = suppliersData.suppliers.filter(
    (supplier) => supplier.active,
  );
  const initialDraft = relationsData.suppliers
    .filter((relation) =>
      activeSuppliers.some((supplier) => supplier.id === relation.supplier_id),
    )
    .map(toDraft);
  const currentDraft = draft ?? initialDraft;
  const selectedIds = new Set(
    currentDraft.map((relation) => relation.supplierId),
  );
  const selectedSuppliers = currentDraft
    .map((relation) => ({
      relation,
      supplier: activeSuppliers.find(
        (supplier) => supplier.id === relation.supplierId,
      ),
    }))
    .filter((item): item is { relation: DraftRelation; supplier: Supplier } =>
      Boolean(item.supplier),
    );
  const pickerSuppliers = activeSuppliers.filter(
    (supplier) =>
      !selectedIds.has(supplier.id) &&
      supplier.name
        .toLocaleLowerCase("es-AR")
        .includes(search.trim().toLocaleLowerCase("es-AR")),
  );
  const inactiveRelations =
    relationsData.suppliers.length - initialDraft.length;
  const allActiveSelected =
    activeSuppliers.length > 0 && activeSuppliers.length === selectedIds.size;

  function addSupplier(supplier: Supplier) {
    setDraft((current) => [
      ...(current ?? currentDraft),
      {
        supplierId: supplier.id,
        preferred: false,
        replenishmentFrequencyDays: "",
      },
    ]);
    setSearch("");
    setPickerOpen(false);
  }
  function removeSupplier(supplierId: string) {
    setFormError(null);
    setDraft((current) =>
      (current ?? currentDraft).filter(
        (relation) => relation.supplierId !== supplierId,
      ),
    );
  }
  function updateRelation(supplierId: string, update: Partial<DraftRelation>) {
    setDraft((current) =>
      (current ?? currentDraft).map((relation) =>
        relation.supplierId === supplierId
          ? { ...relation, ...update }
          : relation,
      ),
    );
  }
  function choosePreferred(supplierId: string | null) {
    setDraft((current) =>
      (current ?? currentDraft).map((relation) => ({
        ...relation,
        preferred: relation.supplierId === supplierId,
      })),
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!currentDraft.length) return;
    setFormError(null);
    setPending(true);
    try {
      const result = await api<ProductSuppliersList>(
        `/products/${productId}/suppliers`,
        {
          method: "PUT",
          body: {
            suppliers: currentDraft.map((relation) => ({
              supplier_id: relation.supplierId,
              preferred: relation.preferred,
              ...(relation.replenishmentFrequencyDays
                ? {
                    replenishment_frequency_days: Number(
                      relation.replenishmentFrequencyDays,
                    ),
                  }
                : {}),
            })),
          },
        },
      );
      setDraft(result.suppliers.map(toDraft));
      toast("success", "Proveedores del producto actualizados");
      reloadRelations();
    } catch (cause) {
      setFormError((cause as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Proveedores del producto
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Asociá proveedores activos y elegí uno preferido para planificación.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPickerOpen(true)}
          disabled={pending || allActiveSelected}
          title={
            allActiveSelected
              ? "Ya asociaste todos los proveedores activos"
              : undefined
          }
        >
          Asociar a proveedor
        </Button>
      </div>

      {inactiveRelations > 0 && (
        <p className="mt-4 text-sm text-text-secondary">
          Hay asociaciones históricas con proveedores inactivos. No están
          disponibles para nuevos pedidos ni para planificación.
        </p>
      )}

      {currentDraft.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            message="Todavía no hay proveedores asociados a este producto."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Asociar a proveedor
              </Button>
            }
          />
        </div>
      ) : (
        <form onSubmit={save} className="mt-6 flex flex-col gap-3">
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="sr-only">
              Proveedores asociados y proveedor preferido para reposición
            </legend>
            <div className="max-h-96 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                {selectedSuppliers.map(({ supplier, relation }) => (
                  <div
                    key={supplier.id}
                    className={`rounded-app border p-4 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      relation.preferred
                        ? "border-primary/40 bg-primary-light/30"
                        : "border-border"
                    }`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-medium">
                          {supplier.name}
                        </p>
                        {relation.preferred && (
                          <Badge tone="pastel-yellow" className="shrink-0">
                            Preferido
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        disabled={pending}
                        onClick={() => removeSupplier(supplier.id)}
                      >
                        Quitar
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                      <Input
                        label="Frecuencia de reposición en días (opcional)"
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={relation.replenishmentFrequencyDays}
                        disabled={pending}
                        onChange={(event) =>
                          updateRelation(supplier.id, {
                            replenishmentFrequencyDays: event.target.value,
                          })
                        }
                        className="sm:w-48"
                      />
                      <label className="flex items-center gap-2 pb-2.5 text-sm">
                        <input
                          type="radio"
                          name="preferred-supplier"
                          checked={relation.preferred}
                          disabled={pending}
                          onChange={() => choosePreferred(supplier.id)}
                          className="size-4 accent-primary"
                        />
                        Proveedor preferido
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="radio"
                name="preferred-supplier"
                checked={!currentDraft.some((relation) => relation.preferred)}
                disabled={pending}
                onChange={() => choosePreferred(null)}
                className="size-4 accent-primary"
              />
              Sin proveedor preferido
            </label>
          </fieldset>
          {!currentDraft.some((relation) => relation.preferred) && (
            <p className="text-sm text-text-secondary">
              Sin proveedor preferido, el backend explicará que falta selección
              al generar sugerencias.
            </p>
          )}
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" pending={pending}>
              Guardar proveedores
            </Button>
          </div>
        </form>
      )}

      <Dialog
        open={pickerOpen}
        title="Asociar a proveedor"
        onClose={() => {
          if (!pending) setPickerOpen(false);
        }}
        dismissible={!pending}
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            label="Buscar proveedor"
            placeholder="Escribí un nombre"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-80 overflow-y-auto rounded-app border border-border">
            <ul>
              {pickerSuppliers.map((supplier) => (
                <li
                  key={supplier.id}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => addSupplier(supplier)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover"
                  >
                    {supplier.name}
                    <span className="text-text-secondary">Asociar</span>
                  </button>
                </li>
              ))}
            </ul>
            {pickerSuppliers.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-text-secondary">
                No hay proveedores activos que coincidan.
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function toDraft(relation: ProductSupplier): DraftRelation {
  return {
    supplierId: relation.supplier_id,
    preferred: relation.preferred,
    replenishmentFrequencyDays:
      relation.replenishment_frequency_days?.toString() ?? "",
  };
}
