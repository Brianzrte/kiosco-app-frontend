"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { computeTotalPages } from "@/lib/pagination";
import { presetRange, today, type RangePreset } from "@/lib/reports";

type Supplier = { id: string; name: string; active: boolean };
type SuppliersResponse = { suppliers: Supplier[] };

type PurchaseOrderStatus = "PENDING" | "RECEIVED" | "CANCELLED";

type PurchaseOrder = {
  id: string;
  supplier_name: string;
  ordered_at: string;
  total: string;
  status: PurchaseOrderStatus;
  received_at: string | null;
  received_by: string | null;
};

type PurchaseOrdersResponse = {
  purchase_orders: PurchaseOrder[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 20;

/** Los tres estados del dominio de compras (`purchasing/domain/purchase_order.go`). */
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  PENDING: "Pendiente",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

const STATUS_TONES: Record<
  PurchaseOrderStatus,
  "success" | "warning" | "neutral"
> = {
  PENDING: "warning",
  RECEIVED: "success",
  CANCELLED: "neutral",
};

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
];

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PurchasesReportView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(1);

  const suppliersFetcher = useCallback(
    () =>
      api<SuppliersResponse>("/suppliers").then((res) => res.suppliers ?? []),
    [],
  );
  const { data: suppliers } = useLoad(suppliersFetcher);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/reports"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver a reportes
        </Link>
      </div>

      <PageHeader title="Compras a proveedores" />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="secondary"
              onClick={() => {
                const range = presetRange(preset.key);
                setFrom(range.from);
                setTo(range.to);
                setPage(1);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <CollapsibleFilters activeFilterCount={supplierId ? 1 : 0}>
          <Input compact label="Desde" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <Input compact label="Hasta" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          <Select label="Proveedor" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }} className="w-56">
            <option value="">Todos los proveedores</option>
            {(suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </CollapsibleFilters>
      </div>

      <PurchasesReportTable
        key={`${from}-${to}-${supplierId}-${page}`}
        from={from}
        to={to}
        supplierId={supplierId}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

function PurchasesReportTable({
  from,
  to,
  supplierId,
  page,
  onPageChange,
}: {
  from: string;
  to: string;
  supplierId: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const fetcher = useCallback(() => {
    const params = new URLSearchParams({
      from,
      to,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (supplierId) params.set("supplier_id", supplierId);
    return api<PurchaseOrdersResponse>(`/purchase-orders?${params.toString()}`);
  }, [from, to, supplierId, page]);
  const { data, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (data === null) return <ListSkeleton rows={6} />;
  if (data.purchase_orders.length === 0) {
    return (
      <EmptyState message="No hay pedidos a proveedores en el período seleccionado." />
    );
  }

  const totalPages = computeTotalPages(data.total, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3 md:hidden">
        {data.purchase_orders.map((order) => (
          <li key={order.id} className="rounded-app border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="num text-sm">{formatDateTime(order.ordered_at)}</p>
              <Badge tone={STATUS_TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
            </div>
            <p className="mt-2 truncate font-medium">{order.supplier_name}</p>
            <p className="num mt-2 text-lg font-semibold">{formatMoney(order.total)}</p>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Proveedor</Th>
            <Th className="text-right">Total</Th>
            <Th>Estado</Th>
            <Th>Recibido</Th>
            <Th>Recibido por</Th>
          </tr>
        </thead>
        <tbody>
          {data.purchase_orders.map((order) => (
            <tr key={order.id}>
              <Td className="num">{formatDateTime(order.ordered_at)}</Td>
              <Td>{order.supplier_name}</Td>
              <Td className="num text-right font-medium">
                {formatMoney(order.total)}
              </Td>
              <Td>
                <Badge tone={STATUS_TONES[order.status]}>
                  {STATUS_LABELS[order.status]}
                </Badge>
              </Td>
              <Td className="num">{formatDateTime(order.received_at)}</Td>
              <Td>{order.received_by ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Página {page} de {totalPages} · {data.total} pedidos
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
