"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { LineChart } from "@/components/reports/charts/LineChart";
import { ReportNavCard } from "@/components/reports/ReportNavCard";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney, fromCents, toCents } from "@/lib/money";
import {
  comparePeriods,
  fillDailySeries,
  periodLengthLabel,
  previousPeriodRange,
  type DailySalesRow,
  type PeriodComparison,
} from "@/lib/reports";

type SalesSummary = { total_sales: number; total_amount: string };

type DailySummary = {
  total_sales: number;
  total_amount: string;
  days?: DailySalesRow[];
};

type TopProduct = {
  product_id: string;
  product_name: string;
  total_quantity: number;
};

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function shortDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
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

      <div className="grid gap-6 lg:grid-cols-2">
        <DailyRevenueSection key={`d-${from}-${to}`} from={from} to={to} />
        <TopProductsCard key={`t-${from}-${to}`} from={from} to={to} />
      </div>

      <ReportNavCards />
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

/**
 * Prominent stat next to the chart (2:3 chart / 1:3 comparison split inside
 * `DailyRevenueSection`'s card) rather than a caption below it — this is the
 * headline number the card leads with, not a footnote.
 */
function ComparisonStat({
  comparison,
  rangeLengthDays,
}: {
  comparison: PeriodComparison;
  rangeLengthDays: number;
}) {
  if (comparison.kind === "both_empty") {
    return (
      <p className="text-sm text-text-secondary">
        Sin ventas en el período ni en {periodLengthLabel(rangeLengthDays)}.
      </p>
    );
  }

  if (comparison.kind === "previous_empty") {
    return (
      <div>
        <p className="text-sm text-text-secondary">
          Comparado con {periodLengthLabel(rangeLengthDays)}
        </p>
        <p className="mt-1 text-lg font-semibold text-text-primary">
          Sin ventas antes
        </p>
      </div>
    );
  }

  const rounded = Math.round(Math.abs(comparison.percent));
  const sign = comparison.percent >= 0 ? "+" : "−";

  return (
    <div>
      <p className="num text-3xl font-semibold text-text-primary">
        {sign}
        {rounded}%
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        de ventas que {periodLengthLabel(rangeLengthDays)}
      </p>
    </div>
  );
}

function DailyRevenueSection({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      api<DailySummary>(
        `/reports/sales/summary?from=${from}&to=${to}&group_by=day`,
      ),
    [from, to],
  );
  const { data, error, reload } = useLoad(fetcher);

  const previousRange = useMemo(
    () => previousPeriodRange(from, to),
    [from, to],
  );
  const previousFetcher = useCallback(
    () =>
      api<SalesSummary>(
        `/reports/sales/summary?from=${previousRange.from}&to=${previousRange.to}`,
      ),
    [previousRange],
  );
  // The comparison card degrades gracefully to "no comparison" on error —
  // the main chart still renders from `data` regardless of this fetch.
  const { data: previousData, error: previousError } = useLoad(previousFetcher);

  const days = useMemo(() => data?.days ?? [], [data]);
  // Filled series is chart-only — the day-by-day table this used to
  // fill from lives in `/reports/sales` (blocked, `ui-reports-detail`) now
  // that the comparison stat takes its place on the dashboard card.
  const filled = useMemo(
    () => fillDailySeries(days, from, to),
    [days, from, to],
  );

  const comparison = useMemo(() => {
    if (!data || !previousData || previousError) return null;
    return comparePeriods(
      toCents(data.total_amount),
      toCents(previousData.total_amount),
    );
  }, [data, previousData, previousError]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        Evolución diaria de ingresos
      </h2>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data === null ? (
        <ListSkeleton rows={3} />
      ) : data.total_sales === 0 ? (
        <EmptyState message="No hay ventas en el período seleccionado." />
      ) : (
        <Card>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <LineChart
                ariaLabel="Ingresos por día"
                height={260}
                points={filled.map((d) => ({
                  x: d.date,
                  y: toCents(d.total_amount),
                  xLabel: shortDateLabel(d.date),
                }))}
                formatValue={(cents) =>
                  formatMoney(fromCents(Math.round(cents)))
                }
              />
            </div>
            <div className="col-span-1 flex flex-col justify-center border-l border-border pl-6">
              {comparison && (
                <ComparisonStat
                  comparison={comparison}
                  rangeLengthDays={filled.length}
                />
              )}
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

function TopProductsCard({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      api<{ products: TopProduct[] }>(
        `/reports/products/top?from=${from}&to=${to}&limit=3`,
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
        <Card>
          <ul className="divide-y divide-border">
            {rows.map((p, index) => (
              <li
                key={p.product_id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {p.product_name}
                  </span>
                </span>
                <span className="num shrink-0 text-sm text-text-secondary">
                  {p.total_quantity} u.
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function ReportNavCards() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-text-secondary">Reportes</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportNavCard
          href="/reports/sales"
          title="Reporte de ventas"
          description="Por día, con desglose por medio de pago y cajero."
        />
        <ReportNavCard
          href="/reports/products"
          title="Reporte de productos"
          description="Stock, costo, precio y margen por producto."
        />
        <ReportNavCard
          href="/reports/inventory-valuation"
          title="Valorización de inventario"
          description="Costo y valor de venta de todo el inventario."
        />
        <ReportNavCard
          href="/reports/purchases"
          title="Compras a proveedores"
          description="Pedidos realizados a proveedores, por fecha y estado."
        />
      </div>
    </section>
  );
}
