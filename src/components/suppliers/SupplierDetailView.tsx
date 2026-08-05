"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge, Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { AssociateProductPopover } from "@/components/suppliers/AssociateProductPopover";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { purchaseOrderStatusLabel } from "@/lib/purchasing";
import {
  ProductList,
  ProductSupplier,
  PurchaseOrderStatus,
  PurchaseOrdersList,
  Supplier,
} from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type DialogState = "edit" | "deactivate" | null;

function valueOrUndefined(value: string | number | null): string {
  return value === null || value === "" ? "Sin definir" : String(value);
}

function visitFrequency(supplier: Supplier): string {
  if (supplier.visit_frequency_days === null) return "Sin definir";
  const interval = `Cada ${supplier.visit_frequency_days} días`;
  return supplier.visit_notes
    ? `${interval}, ${supplier.visit_notes}`
    : interval;
}

function replenishmentFrequency(days: number | undefined): string {
  return days === undefined ? "Sin definir" : `cada ${days} días`;
}

function statusTone(status: PurchaseOrderStatus): Tone {
  if (status === "PENDING") return "warning";
  if (status === "RECEIVED") return "success";
  return "error";
}

function orderDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function SectionError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-error/40 bg-error/10 p-4"
    >
      <p className="text-sm text-(--color-error-strong)">
        {(error as ApiError).message || "No pudimos cargar esta información."}
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function SupplierDetailView({ id }: { id: string }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [visitFrequencyDays, setVisitFrequencyDays] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [notes, setNotes] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const deactivateTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const fetcher = useCallback(() => api<Supplier>(`/suppliers/${id}`), [id]);
  const { data: supplier, error, reload } = useLoad(fetcher);
  const productsFetcher = useCallback(async () => {
    const { products } = await api<ProductList>("/products?limit=100");
    const associations = await Promise.all(
      products.map(async (product) => {
        const { suppliers } = await api<{ suppliers: ProductSupplier[] }>(
          `/products/${product.id}/suppliers`,
        );
        const association = suppliers.find((item) => item.supplier_id === id);
        return association ? { product, association } : null;
      }),
    );
    return associations.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  }, [id]);
  const ordersFetcher = useCallback(
    () => api<PurchaseOrdersList>(`/purchase-orders?supplier_id=${id}&limit=3`),
    [id],
  );
  const {
    data: products,
    error: productsError,
    reload: reloadProducts,
  } = useLoad(productsFetcher);
  const {
    data: orders,
    error: ordersError,
    reload: reloadOrders,
  } = useLoad(ordersFetcher);

  useEffect(() => {
    if (!dialog) return;
    const target = dialog === "edit" ? nameInputRef : cancelRef;
    const frame = requestAnimationFrame(() => target.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [dialog]);

  function closeDialog() {
    if (pending) return;
    const trigger = dialog === "edit" ? editTriggerRef : deactivateTriggerRef;
    setDialog(null);
    setFormError(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  function openEdit() {
    if (!supplier) return;
    setName(supplier.name);
    setPhone(supplier.phone ?? "");
    setAddress(supplier.address ?? "");
    setVisitFrequencyDays(supplier.visit_frequency_days?.toString() ?? "");
    setVisitNotes(supplier.visit_notes ?? "");
    setNotes(supplier.notes ?? "");
    setFormError(null);
    setDialog("edit");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supplier || !name.trim()) return;
    setPending(true);
    setFormError(null);
    try {
      await api<Supplier>(`/suppliers/${supplier.id}`, {
        method: "PUT",
        body: {
          name: name.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(address.trim() ? { address: address.trim() } : {}),
          ...(visitFrequencyDays
            ? { visit_frequency_days: Number(visitFrequencyDays) }
            : {}),
          ...(visitNotes.trim() ? { visit_notes: visitNotes.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      setDialog(null);
      toast("success", "Proveedor actualizado");
      await reload();
      requestAnimationFrame(() => editTriggerRef.current?.focus());
    } catch (cause) {
      setFormError((cause as ApiError).message);
      nameInputRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    if (!supplier) return;
    setPending(true);
    setFormError(null);
    try {
      await api<Supplier>(`/suppliers/${supplier.id}/deactivate`, {
        method: "PATCH",
      });
      setDialog(null);
      toast("success", "Proveedor desactivado");
      await reload();
      requestAnimationFrame(() => deactivateTriggerRef.current?.focus());
    } catch (cause) {
      setFormError((cause as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  if (error) {
    if ((error as ApiError).status === 404) {
      return (
        <section className="flex flex-col gap-6">
          <PageHeader title="Proveedor no encontrado" />
          <Card className="flex flex-col items-start gap-4">
            <p className="text-sm text-text-secondary">
              No encontramos este proveedor.
            </p>
            <Link href="/purchasing/suppliers">
              <Button variant="secondary">Volver a proveedores</Button>
            </Link>
          </Card>
        </section>
      );
    }
    return <ErrorState error={error} onRetry={reload} />;
  }
  if (!supplier) return <LoadingState />;

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/purchasing/suppliers"
        className="w-fit text-sm font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        ← Volver a proveedores
      </Link>

      <PageHeader
        title={supplier.name}
        titleAdornment={
          <Badge tone={supplier.active ? "success" : "neutral"}>
            {supplier.active ? "Activo" : "Inactivo"}
          </Badge>
        }
        description={
          supplier.visit_frequency_days === null
            ? "Frecuencia de visita sin definir"
            : visitFrequency(supplier)
        }
        actions={
          <>
            <Button ref={editTriggerRef} variant="secondary" onClick={openEdit}>
              Editar ficha
            </Button>
            {supplier.active && (
              <Button
                ref={deactivateTriggerRef}
                variant="ghost"
                className="border border-error/40 !text-error hover:!bg-error/10"
                onClick={() => {
                  setFormError(null);
                  setDialog("deactivate");
                }}
              >
                Desactivar
              </Button>
            )}
          </>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          Datos de contacto
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Empresa
            </dt>
            <dd className="mt-1 text-text-primary">{supplier.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Teléfono
            </dt>
            <dd className="mt-1 font-mono text-text-primary">
              {valueOrUndefined(supplier.phone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Dirección
            </dt>
            <dd className="mt-1 text-text-primary">
              {valueOrUndefined(supplier.address)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Frecuencia de visita
            </dt>
            <dd className="mt-1 text-text-primary">
              {visitFrequency(supplier)}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Notas
            </dt>
            <dd className="mt-1 text-text-primary">
              {valueOrUndefined(supplier.notes)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Productos asociados ({products?.length ?? 0})
          </h2>
          <AssociateProductPopover
            supplierId={id}
            onAssociated={reloadProducts}
          />
        </div>
        <div className="mt-5">
          {productsError ? (
            <SectionError error={productsError} onRetry={reloadProducts} />
          ) : !products ? (
            <LoadingState label="Cargando productos asociados…" />
          ) : products.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Este proveedor todavía no tiene productos asociados.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {products.map(({ product, association }) => (
                  <li key={product.id} className="py-4 first:pt-0">
                    <Link
                      className="font-medium text-text-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      href={`/products/${product.id}`}
                    >
                      {product.name}
                    </Link>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Preferido
                        </dt>
                        <dd className="mt-1">
                          {association.preferred ? (
                            <Badge tone="warning">Preferido</Badge>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Reposición
                        </dt>
                        <dd className="mt-1 text-text-secondary">
                          {replenishmentFrequency(
                            association.replenishment_frequency_days,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <Table className="hidden md:block">
                <thead>
                  <tr>
                    <Th>Producto</Th>
                    <Th>Preferido</Th>
                    <Th className="text-right">Reposición</Th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(({ product, association }) => (
                    <tr key={product.id}>
                      <Td>
                        <Link
                          className="font-medium text-text-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          href={`/products/${product.id}`}
                        >
                          {product.name}
                        </Link>
                      </Td>
                      <Td>
                        {association.preferred ? (
                          <Badge tone="warning">Preferido</Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </Td>
                      <Td className="text-right text-text-secondary">
                        {replenishmentFrequency(
                          association.replenishment_frequency_days,
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">
            Historial de pedidos con este proveedor
          </h2>
          <Link
            className="text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            href={`/purchasing/history?supplier_id=${id}`}
          >
            Ver historial completo →
          </Link>
        </div>
        <div className="mt-5">
          {ordersError ? (
            <SectionError error={ordersError} onRetry={reloadOrders} />
          ) : !orders ? (
            <LoadingState label="Cargando pedidos…" />
          ) : orders.purchase_orders.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Todavía no hay pedidos para este proveedor.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {orders.purchase_orders.map((order) => (
                  <li key={order.id} className="py-4 first:pt-0">
                    <Link
                      className="font-medium text-text-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      href={`/purchasing/${order.id}`}
                    >
                      {orderDate(order.ordered_at)}
                    </Link>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="num font-medium text-text-primary">
                        {formatMoney(order.total)}
                      </span>
                      <Badge tone={statusTone(order.status)}>
                        {purchaseOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <Table className="hidden md:block">
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.purchase_orders.map((order) => (
                    <tr key={order.id}>
                      <Td>
                        <Link
                          className="font-medium text-text-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          href={`/purchasing/${order.id}`}
                        >
                          {orderDate(order.ordered_at)}
                        </Link>
                      </Td>
                      <Td className="num text-right font-medium text-text-primary">
                        {formatMoney(order.total)}
                      </Td>
                      <Td>
                        <Badge tone={statusTone(order.status)}>
                          {purchaseOrderStatusLabel(order.status)}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>
      </Card>

      <Dialog
        open={dialog === "edit"}
        title="Editar proveedor"
        onClose={closeDialog}
        dismissible={!pending}
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <Input
            ref={nameInputRef}
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={formError ?? undefined}
            required
            disabled={pending}
          />
          <Input
            label="Teléfono"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={pending}
          />
          <Input
            label="Dirección"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={pending}
          />
          <Input
            label="Frecuencia de visita (días)"
            type="number"
            min="1"
            inputMode="numeric"
            value={visitFrequencyDays}
            onChange={(event) => setVisitFrequencyDays(event.target.value)}
            disabled={pending}
          />
          <Input
            label="Notas de visita"
            value={visitNotes}
            onChange={(event) => setVisitNotes(event.target.value)}
            disabled={pending}
          />
          <Input
            label="Notas generales"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={pending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDialog}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" pending={pending} disabled={!name.trim()}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={dialog === "deactivate"}
        title="Desactivar proveedor"
        onClose={closeDialog}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Vas a desactivar a{" "}
            <strong className="text-text-primary">{supplier.name}</strong>.
            Seguirá visible en el historial, pero no se podrá elegir en pedidos
            nuevos.
          </p>
          {formError && (
            <p role="alert" className="text-sm text-error">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={closeDialog}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={deactivate} pending={pending}>
              Desactivar proveedor
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
