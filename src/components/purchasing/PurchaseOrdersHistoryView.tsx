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
  buildPurchaseOrdersQuery,
  PURCHASE_ORDER_PAGE_SIZE,
  purchaseOrderStatusLabel,
} from "@/lib/purchasing";
import { PurchaseOrderStatus, PurchaseOrdersList, Supplier } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

type HistoryStatus = "" | "PENDING" | "RECEIVED";

function statusTone(status: PurchaseOrderStatus) {
  if (status === "PENDING") return "warning" as const;
  if (status === "RECEIVED") return "success" as const;
  return "error" as const;
}

export function PurchaseOrdersHistoryView() {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<HistoryStatus>("");
  const [page, setPage] = useState(1);

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
      status,
      page,
    });
    return api<PurchaseOrdersList>(`/purchase-orders?${query}`);
  }, [supplier, from, to, status, page]);
  const { data, error, reload } = useLoad(fetcher);

  const hasFilters = Boolean(supplier || from || to || status);
  const clearFilters = () => {
    setSupplier("");
    setFrom("");
    setTo("");
    setStatus("");
    setPage(1);
  };
  const openOrder = (id: string) => router.push(`/purchasing/${id}`);
  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openOrder(id);
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={6} />;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Historial de pedidos"
        description="Consultá los pedidos creados y su recepción."
        actions={
          <Button variant="secondary" onClick={() => router.push("/purchasing")}>
            Volver a compras
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3 rounded-app border border-border bg-surface-subtle p-3">
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
        <Select
          label="Estado"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as HistoryStatus);
            setPage(1);
          }}
          className="w-full sm:w-44"
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendiente</option>
          <option value="RECEIVED">Recibido</option>
        </Select>
        <Input
          label="Desde"
          type="date"
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
        <p className="w-full text-sm text-text-secondary" aria-live="polite">
          {data.total === 1 ? "1 pedido" : `${data.total} pedidos`}
        </p>
      </div>

      {data.purchase_orders.length === 0 ? (
        <EmptyState
          message={
            hasFilters
              ? "No hay pedidos con esos filtros."
              : "Todavía no hay pedidos de compra."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Proveedor</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
                <Th>Recibido por</Th>
                <Th className="text-right">Costo</Th>
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
                  <Td className="font-medium">{order.supplier_name}</Td>
                  <Td>
                    <Badge tone={statusTone(order.status)}>
                      {purchaseOrderStatusLabel(order.status)}
                    </Badge>
                  </Td>
                  <Td>
                    {new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(
                      new Date(order.ordered_at),
                    )}
                  </Td>
                  <Td>{order.received_by ?? "—"}</Td>
                  <Td className="num text-right">{formatMoney(order.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {computeTotalPages(data.total, PURCHASE_ORDER_PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-end gap-2">
              <p className="mr-auto text-sm text-text-secondary">
                Página {page} de {computeTotalPages(data.total, PURCHASE_ORDER_PAGE_SIZE)}
              </p>
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={page === computeTotalPages(data.total, PURCHASE_ORDER_PAGE_SIZE)}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
