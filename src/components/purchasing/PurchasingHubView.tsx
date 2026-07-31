"use client";

import { KeyboardEvent, ReactNode, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import {
  buildPurchaseOrdersQuery,
  PURCHASE_ORDER_PAGE_SIZE,
  purchaseOrderStatusLabel,
} from "@/lib/purchasing";
import { hasUncataloguedItems } from "@/lib/receiving";
import { PurchaseOrdersList, Supplier } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { hasAnyRole } from "@/lib/roleAccess";
import { Role } from "@/lib/types";

export function PurchasingHubView({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const suppliersFetcher = useCallback(
    () => api<{ suppliers: Supplier[] }>("/suppliers").then((result) => result.suppliers),
    [],
  );
  const { data: suppliers } = useLoad(suppliersFetcher);

  const fetcher = useCallback(() => {
    const query = buildPurchaseOrdersQuery({
      supplierId: supplier,
      from,
      to,
      status: "PENDING",
      page,
    });
    return api<PurchaseOrdersList>(`/purchase-orders?${query}`);
  }, [supplier, from, to, page]);
  const { data, error, reload } = useLoad(fetcher);

  const hasFilters = Boolean(supplier || from || to);
  const clearFilters = () => {
    setSupplier("");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const openOrder = (id: string) => router.push(`/purchasing/${id}`);
  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOrder(id);
  };

  const canManage = hasAnyRole(roles, ["admin", "inventory"]);
  let pendingOrdersContent: ReactNode;

  if (error) {
    pendingOrdersContent = <ErrorState error={error} onRetry={reload} />;
  } else if (!data) {
    pendingOrdersContent = <ListSkeleton rows={6} />;
  } else if (data.purchase_orders.length === 0) {
    pendingOrdersContent = (
      <EmptyState
        message={
          hasFilters
            ? "No hay pedidos pendientes con esos filtros."
            : "No hay pedidos pendientes para recibir."
        }
        action={
          hasFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const pages = computeTotalPages(data.total, PURCHASE_ORDER_PAGE_SIZE);
    pendingOrdersContent = (
      <>
        <ul className="flex flex-col gap-3 md:hidden">
          {data.purchase_orders.map((order) => (
            <li
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => openOrder(order.id)}
              onKeyDown={(event) => onRowKeyDown(event, order.id)}
              className="cursor-pointer rounded-app border border-border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 font-medium text-text-primary">
                  {order.supplier_name}
                </p>
                <Badge tone="warning">{purchaseOrderStatusLabel(order.status)}</Badge>
              </div>
              {hasUncataloguedItems(order) && (
                <Badge className="mt-2" tone="warning">
                  Pendiente de alta
                </Badge>
              )}
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xs text-text-secondary">
                  {new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
                    new Date(order.ordered_at),
                  )}
                </p>
                <p className="num text-lg font-semibold">{formatMoney(order.total)}</p>
              </div>
            </li>
          ))}
        </ul>

        <Table className="hidden md:block">
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Fecha</Th>
              <Th className="text-right">Total</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {data.purchase_orders.map((order) => (
              <tr
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => openOrder(order.id)}
                onKeyDown={(event) => onRowKeyDown(event, order.id)}
                className="cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover"
              >
                <Td>
                  {order.supplier_name}
                  {hasUncataloguedItems(order) && (
                    <Badge className="ml-2" tone="warning">
                      Pendiente de alta
                    </Badge>
                  )}
                </Td>
                <Td>
                  {new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
                    new Date(order.ordered_at),
                  )}
                </Td>
                <Td className="num text-right">{formatMoney(order.total)}</Td>
                <Td>
                  <Badge tone="warning">{purchaseOrderStatusLabel(order.status)}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <p className="mr-auto text-sm text-text-secondary">
              Página {page} de {pages}
            </p>
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Compras y recepción"
        description="Revisá los pedidos pendientes de proveedores."
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
          {data && (
            <div className="rounded-app border border-border bg-surface-subtle px-3 py-1.5 md:p-3">
              <div className="flex items-center justify-between gap-3">
                <CollapsibleFilters
                  activeFilterCount={Number(Boolean(supplier)) + Number(Boolean(from)) + Number(Boolean(to))}
                  open={filtersOpen}
                  onOpenChange={setFiltersOpen}
                  className="order-last w-auto md:order-none"
                >
                  <Select
                    label="Proveedor"
                    value={supplier}
                    onChange={(event) => {
                      setSupplier(event.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-56"
                  >
                    <option value="">Todos</option>
                    {(suppliers ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Desde"
                    type="date"
                    compact
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto"
                  />
                  <Input
                    label="Hasta"
                    type="date"
                    compact
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto"
                  />
                  {hasFilters && (
                    <Button variant="ghost" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </CollapsibleFilters>
                <p className={`${filtersOpen ? "hidden md:block" : ""} order-first whitespace-nowrap text-sm text-text-secondary`} aria-live="polite">
                  {data.total === 1 ? "1 pedido pendiente" : `${data.total} pedidos pendientes`}
                </p>
              </div>
            </div>
          )}
          {pendingOrdersContent}
        </div>
        <aside aria-label="Acciones de compras" className="order-first md:order-none">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-medium text-text-secondary">Acciones</h2>
            {canManage && (
              <Button onClick={() => router.push("/purchasing/new")}>Crear pedido</Button>
            )}
            <Button variant={canManage ? "secondary" : "primary"} onClick={() => router.push("/purchasing/history")}>
              Historial de pedidos
            </Button>
            {canManage && (
              <Button variant="secondary" onClick={() => router.push("/purchasing/suppliers")}>
                Lista de proveedores
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </section>
  );
}
