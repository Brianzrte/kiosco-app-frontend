"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { ProductList } from "@/lib/types";

type SalesSummary = { total_sales: number; total_amount: string };

type TopProduct = {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: string;
};

type StockMovement = {
  product_id: string;
  type: string;
  quantity_delta: number;
  reason: string;
  created_at: string;
};

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const movementLabels: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
  sale: "Venta",
};

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
      <TopProductsSection key={`t-${from}-${to}`} from={from} to={to} />
      <StockHistorySection />
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
        <ErrorState message={error} onRetry={reload} />
      ) : summary === null ? (
        <LoadingState />
      ) : summary.total_sales > 0 ? (
        <div className="grid max-w-xl grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-text-secondary">Ventas</p>
            <p className="data mt-1 text-3xl font-semibold">
              {summary.total_sales}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary">Total facturado</p>
            <p className="data mt-1 text-3xl font-semibold">
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

function TopProductsSection({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      api<TopProduct[]>(
        `/reports/products/top?from=${from}&to=${to}&limit=10`,
      ).then((data) => data ?? []),
    [from, to],
  );
  const { data: rows, error, reload } = useLoad(fetcher);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Productos más vendidos
      </h2>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows === null ? (
        <LoadingState />
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
                <Td className="data text-right">{row.quantity_sold}</Td>
                <Td className="data text-right">
                  {formatMoney(String(row.revenue))}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}

function StockHistorySection() {
  const [productId, setProductId] = useState("");

  const productsFetcher = useCallback(
    () => api<ProductList>("/products").then((list) => list.products),
    [],
  );
  const { data: products } = useLoad(productsFetcher);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Historial de movimientos de stock
      </h2>
      <Select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="mb-4 max-w-md"
        aria-label="Producto del historial"
      >
        <option value="">Elegí un producto</option>
        {(products ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.sku})
          </option>
        ))}
      </Select>
      {!productId ? (
        <EmptyState message="Elegí un producto para ver sus movimientos." />
      ) : (
        <StockHistoryTable key={productId} productId={productId} />
      )}
    </section>
  );
}

function StockHistoryTable({ productId }: { productId: string }) {
  const fetcher = useCallback(
    () =>
      api<StockMovement[]>(
        `/reports/stock/history?product_id=${productId}`,
      ).then((data) => data ?? []),
    [productId],
  );
  const { data: rows, error, reload } = useLoad(fetcher);

  return (
    <>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows === null ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState message="Este producto no tiene movimientos registrados." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Cantidad</Th>
              <Th>Motivo</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <Td className="data">
                  {new Date(row.created_at).toLocaleString("es-AR")}
                </Td>
                <Td>{movementLabels[row.type] ?? row.type}</Td>
                <Td
                  className={`data text-right ${
                    row.quantity_delta < 0 ? "text-error" : "text-success"
                  }`}
                >
                  {row.quantity_delta > 0 ? "+" : ""}
                  {row.quantity_delta}
                </Td>
                <Td className="text-text-secondary">{row.reason}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
