"use client";

import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { IconAlert, IconClock, IconPlus } from "@/components/ui/icons";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
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
import { computePageSize, computeTotalPages } from "@/lib/pagination";

export function PurchasingHubView({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSize, setPageSize] = useState(PURCHASE_ORDER_PAGE_SIZE);
  const listRef = useRef<HTMLUListElement>(null);

  const suppliersFetcher = useCallback(
    () =>
      api<{ suppliers: Supplier[] }>("/suppliers").then(
        (result) => result.suppliers,
      ),
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
      limit: pageSize,
    });
    return api<PurchaseOrdersList>(`/purchase-orders?${query}`);
  }, [supplier, from, to, page, pageSize]);
  const { data, error, reload } = useLoad(fetcher);
  useEffect(() => {
    if (!data || data.purchase_orders.length === 0) return;
    const recompute = () => {
      const rect = listRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = computePageSize({
        viewportHeight: window.innerHeight,
        listTop: rect.top,
        rowHeight: rect.height / data.purchase_orders.length,
        reservedBelow: 56,
        min: 5,
        max: 15,
        fallback: PURCHASE_ORDER_PAGE_SIZE,
      });
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [data, pageSize]);

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
          ) : canManage ? (
            <Button
              className="gap-1.5"
              onClick={() => router.push("/purchasing/new")}
            >
              <IconPlus className="size-4" />
              Crear pedido
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const pages = computeTotalPages(data.total, pageSize);
    pendingOrdersContent = (
      <>
        <ul ref={listRef} className="flex flex-col gap-3">
          {data.purchase_orders.map((order) => (
            <li
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => openOrder(order.id)}
              onKeyDown={(event) => onRowKeyDown(event, order.id)}
              className="flex cursor-pointer flex-col gap-3 rounded-app border border-border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate font-medium text-text-primary">
                    {order.supplier_name}
                  </p>
                  {hasUncataloguedItems(order) && (
                    <Badge
                      tone="warning"
                      icon={<IconAlert className="size-3" />}
                    >
                      Pendiente de alta
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "long",
                  }).format(new Date(order.ordered_at))}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Badge tone="warning" icon={<IconClock className="size-3" />}>
                  {purchaseOrderStatusLabel(order.status)}
                </Badge>
                <p className="num text-lg font-semibold">
                  {formatMoney(order.total)}
                </p>
                <Button
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    openOrder(order.id);
                  }}
                >
                  Recibir
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <p className="mr-auto text-sm text-text-secondary">
              Página {page} de {pages}
            </p>
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
            >
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
        title="Compras y proveedores"
        description="Qué llega, qué recibir y con quién."
        actions={
          <>
            {canManage && (
              <Button
                variant="secondary"
                onClick={() => router.push("/purchasing/suppliers")}
              >
                Lista de proveedores
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push("/purchasing/history")}
            >
              Historial de pedidos
            </Button>
            {canManage && (
              <Button onClick={() => router.push("/purchasing/new")}>
                Crear pedido
              </Button>
            )}
          </>
        }
      />
      <div className="flex min-w-0 flex-col gap-4">
        {pendingOrdersContent}
        {data && (
          <div className="rounded-app border border-border bg-surface-subtle px-3 py-1.5 md:p-3">
            <div className="flex items-center justify-between gap-3">
              <CollapsibleFilters
                activeFilterCount={
                  Number(Boolean(supplier)) +
                  Number(Boolean(from)) +
                  Number(Boolean(to))
                }
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
              <p
                className={`${filtersOpen ? "hidden md:block" : ""} order-first whitespace-nowrap text-sm text-text-secondary`}
                aria-live="polite"
              >
                {data.total === 1
                  ? "1 pedido pendiente"
                  : `${data.total} pedidos pendientes`}
              </p>
            </div>
          </div>
        )}
        {canManage && (
          <Link
            href="/purchasing/new"
            className="flex items-center justify-between gap-3 rounded-app border border-dashed border-border bg-surface-subtle px-4 py-3 text-sm text-text-secondary transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover"
          >
            <span>
              ¿Buscás qué reponer? Las sugerencias de reposición viven en el
              formulario de pedido nuevo.
            </span>
            <span className="shrink-0 font-medium text-primary">
              Ir a sugerencias →
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
