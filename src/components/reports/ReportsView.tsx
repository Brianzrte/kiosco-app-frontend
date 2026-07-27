"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";

type SalesSummary = { total_sales: number; total_amount: string };

type TopProduct = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: string;
};

type SaleListItem = {
  id: string;
  confirmed_at: string;
  cashier: string;
  payment_method: string;
  total: string;
  item_count: number;
};

type SaleDetailItem = {
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
};

type SaleDetail = {
  id: string;
  confirmed_at: string;
  cashier: string;
  payment_method: string;
  total: string;
  items: SaleDetailItem[];
};

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <div className="flex gap-3">
          <Input
            label="Desde"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <SalesSummarySection key={`s-${from}-${to}`} from={from} to={to} />
      <SalesListSection key={`l-${from}-${to}`} from={from} to={to} />
      <TopProductsSection key={`t-${from}-${to}`} from={from} to={to} />
    </div>
  );
}

function SalesSummarySection({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () => api<SalesSummary>(`/reports/sales/summary?from=${from}&to=${to}`),
    [from, to],
  );
  const { data: summary, error, reload } = useLoad(fetcher);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Resumen de ventas
      </h2>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : summary === null ? (
        <ListSkeleton rows={3} />
      ) : summary.total_sales > 0 ? (
        <div className="grid max-w-xl grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-text-secondary">Ventas</p>
            <p className="num mt-1 text-3xl font-semibold">
              {summary.total_sales}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary">Total facturado</p>
            <p className="num mt-1 text-3xl font-semibold">
              {formatMoney(String(summary.total_amount))}
            </p>
          </Card>
        </div>
      ) : (
        <EmptyState message="No hay ventas en el período seleccionado." />
      )}
    </section>
  );
}

const paymentLabels: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

function SalesListSection({ from, to }: { from: string; to: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fetcher = useCallback(
    () =>
      api<{ sales: SaleListItem[] }>(
        `/reports/sales?from=${from}&to=${to}`,
      ).then((data) => data?.sales ?? []),
    [from, to],
  );
  const { data: rows, error, reload } = useLoad(fetcher);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Ventas realizadas
      </h2>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows === null ? (
        <ListSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState message="No hay ventas en el período seleccionado." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Cajero</Th>
              <Th>Medio de pago</Th>
              <Th className="text-right">Ítems</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(row.id);
                  }
                }}
                tabIndex={0}
                role="button"
                className="cursor-pointer transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
              >
                <Td className="data">
                  {new Date(row.confirmed_at).toLocaleString("es-AR")}
                </Td>
                <Td>{row.cashier}</Td>
                <Td>
                  {paymentLabels[row.payment_method] ?? row.payment_method}
                </Td>
                <Td className="num text-right">{row.item_count}</Td>
                <Td className="num text-right font-medium">
                  {formatMoney(String(row.total))}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog
        open={selectedId !== null}
        title="Detalle de venta"
        onClose={() => setSelectedId(null)}
      >
        {selectedId && <SaleReceipt saleId={selectedId} />}
      </Dialog>
    </section>
  );
}

function SaleReceipt({ saleId }: { saleId: string }) {
  const fetcher = useCallback(
    () => api<SaleDetail>(`/reports/sales/${saleId}`),
    [saleId],
  );
  const { data: detail, error, reload } = useLoad(fetcher);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (detail === null) return <ListSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {new Date(detail.confirmed_at).toLocaleString("es-AR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Atendió {detail.cashier}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-rose-light px-3 py-1 text-xs font-medium text-rose-strong">
          {paymentLabels[detail.payment_method] ?? detail.payment_method}
        </span>
      </div>

      <ul className="divide-y divide-border rounded-app border border-border">
        {detail.items.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {item.product_name}
              </p>
              <p className="num mt-0.5 text-xs text-text-secondary">
                {item.quantity} × {formatMoney(String(item.unit_price))}
              </p>
            </div>
            <span className="num shrink-0 text-sm">
              {formatMoney(String(item.subtotal))}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-app bg-rose-strong px-4 py-3 text-text-inverse">
        <span className="text-sm font-medium">Total de la venta</span>
        <span className="num text-xl font-semibold">
          {formatMoney(String(detail.total))}
        </span>
      </div>
    </div>
  );
}

function TopProductsSection({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      api<{ products: TopProduct[] }>(
        `/reports/products/top?from=${from}&to=${to}&limit=10`,
      ).then((data) => data?.products ?? []),
    [from, to],
  );
  const { data: rows, error, reload } = useLoad(fetcher);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Productos más vendidos
      </h2>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : rows === null ? (
        <ListSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState message="No hay productos vendidos en el período." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Producto</Th>
              <Th className="text-right">Unidades</Th>
              <Th className="text-right">Facturado</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.product_id}>
                <Td className="data">{index + 1}</Td>
                <Td className="font-medium">{row.product_name}</Td>
                <Td className="num text-right">{row.total_quantity}</Td>
                <Td className="num text-right">
                  {formatMoney(String(row.total_revenue))}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
