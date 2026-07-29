"use client";
import { KeyboardEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import {
  hasUncataloguedItems,
  orderForReceiving,
  statusLabel,
} from "@/lib/receiving";
import { PurchaseOrdersList, Supplier } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

export function ReceivingListView() {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const suppliersFetcher = useCallback(
    () => api<{ suppliers: Supplier[] }>("/suppliers").then((r) => r.suppliers),
    [],
  );
  const { data: suppliers } = useLoad(suppliersFetcher);

  const fetcher = useCallback(() => {
    const p = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (supplier) p.set("supplier_id", supplier);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return api<PurchaseOrdersList>(`/purchase-orders?${p}`);
  }, [supplier, from, to, page]);
  const { data, error, reload } = useLoad(fetcher);

  const activate = (id: string) => router.push(`/receiving/${id}`);
  // Shared by both the mobile <li> card and the desktop <tr> row below —
  // typed against KeyboardEvent<HTMLElement> rather than one specific
  // element so it works for either.
  const key = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(id);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={6} />;
  if (!data.purchase_orders.length)
    return (
      <EmptyState
        message="No hay pedidos con esos filtros."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setSupplier("");
              setFrom("");
              setTo("");
            }}
          >
            Limpiar filtros
          </Button>
        }
      />
    );

  const orders = orderForReceiving(data.purchase_orders);
  const pages = computeTotalPages(data.total, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Recepción"
        description="Revisá los pedidos que llegan de proveedores."
      />
      <div className="flex flex-wrap items-end gap-3 rounded-app border border-border bg-surface-subtle p-3">
        <Select
          label="Proveedor"
          value={supplier}
          onChange={(e) => {
            setSupplier(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-56"
        >
          <option value="">Todos</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input
          label="Desde"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto"
        />
        <Input
          label="Hasta"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto"
        />
      </div>
      {/* Mobile: one card per order — same pattern as ProductsView/SalesView/UsersView */}
      <ul className="flex flex-col gap-3 md:hidden">
        {orders.map((o) => (
          <li
            key={o.id}
            role="button"
            tabIndex={0}
            onClick={() => activate(o.id)}
            onKeyDown={(e) => key(e, o.id)}
            className="cursor-pointer rounded-app border border-border bg-surface p-4 shadow-soft transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:border-border-hover hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 font-medium text-text-primary">
                {o.supplier_name}
              </p>
              <Badge tone={o.status === "PENDING" ? "warning" : "success"}>
                {statusLabel(o.status)}
              </Badge>
            </div>
            {hasUncataloguedItems(o) && (
              <Badge className="mt-2" tone="warning">
                Pendiente de alta
              </Badge>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-xs text-text-secondary">
                {new Intl.DateTimeFormat("es-AR", {
                  dateStyle: "short",
                }).format(new Date(o.ordered_at))}
              </p>
              <p className="num text-lg font-semibold">
                {formatMoney(o.total)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Fecha</Th>
              <Th>Total</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => activate(o.id)}
                onKeyDown={(e) => key(e, o.id)}
                className="cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] hover:bg-surface-hover focus-visible:bg-surface-hover"
              >
                <Td>
                  {o.supplier_name}
                  {hasUncataloguedItems(o) && (
                    <Badge className="ml-2" tone="warning">
                      Pendiente de alta
                    </Badge>
                  )}
                </Td>
                <Td>
                  {new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "short",
                  }).format(new Date(o.ordered_at))}
                </Td>
                <Td className="num">{formatMoney(o.total)}</Td>
                <Td>
                  <Badge tone={o.status === "PENDING" ? "warning" : "success"}>
                    {statusLabel(o.status)}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      {pages > 1 && (
        <div className="flex justify-end gap-2">
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
    </div>
  );
}
