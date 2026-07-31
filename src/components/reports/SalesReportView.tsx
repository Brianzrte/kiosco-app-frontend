"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleFilters } from "@/components/ui/CollapsibleFilters";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { SummaryCards } from "@/components/sales/SummaryCards";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { computePageSize, computeTotalPages } from "@/lib/pagination";
import { buildSummaryQuery } from "@/lib/salesSummary";
import type { SalesSummaryByPaymentMethod } from "@/lib/salesSummary";
import { addDays, presetRange, today, type RangePreset } from "@/lib/reports";

type PaymentBreakdown = { method: string; total_amount: string };
type CashierBreakdown = {
  cashier_id: string;
  cashier_name: string;
  total_amount: string;
};
type DailyBreakdownRow = {
  date: string;
  total_sales: number;
  total_amount: string;
  by_payment_method: PaymentBreakdown[];
  cashiers: CashierBreakdown[];
};
type DailyBreakdownResponse = {
  days: DailyBreakdownRow[];
  page: number;
  limit: number;
  total: number;
};

/** Amount for `method` on `row`, zero when the backend didn't report it —
 * columns must stay aligned across rows (ui-reports-detail). */
function amountFor(row: DailyBreakdownRow, method: string): string {
  return (
    row.by_payment_method.find((m) => m.method === method)?.total_amount ??
    "0.00"
  );
}

function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

type DayPreset = "today" | "yesterday";
type SalesPreset = DayPreset | RangePreset;
const DAILY_PAGE_SIZE = 20;

const DAY_PRESETS: { key: DayPreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
];

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "six_months", label: "Últimos 6 meses" },
];

function firstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function SalesReportView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [activePreset, setActivePreset] = useState<SalesPreset | null>("month");

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

      <PageHeader title="Reporte de ventas" />

      <SalesReportContent
        key={`${from}-${to}`}
        from={from}
        to={to}
        activePreset={activePreset}
        onFromChange={(value) => {
          setFrom(value);
          setActivePreset(null);
        }}
        onToChange={(value) => {
          setTo(value);
          setActivePreset(null);
        }}
        onPresetChange={(key) => {
          if (key === "today" || key === "yesterday") {
            const day = key === "today" ? today() : addDays(today(), -1);
            setFrom(day);
            setTo(day);
          } else {
            const range = presetRange(key);
            setFrom(range.from);
            setTo(range.to);
          }
          setActivePreset(key);
        }}
      />
    </div>
  );
}

function SalesReportFilters({
  from,
  to,
  activePreset,
  onFromChange,
  onToChange,
  onPresetChange,
}: {
  from: string;
  to: string;
  activePreset: SalesPreset | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPresetChange: (key: SalesPreset) => void;
}) {
  return (
    <CollapsibleFilters activeFilterCount={activePreset === null ? 1 : 0}>
      <div className="flex flex-wrap gap-2">
        {DAY_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant={activePreset === preset.key ? "primary" : "secondary"}
            onClick={() => onPresetChange(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
        {RANGE_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant={activePreset === preset.key ? "primary" : "secondary"}
            onClick={() => onPresetChange(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Input
        compact
        label="Desde"
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <Input
        compact
        label="Hasta"
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
      />
    </CollapsibleFilters>
  );
}

function CashierPills({ cashiers }: { cashiers: CashierBreakdown[] }) {
  if (cashiers.length === 0) {
    return <span className="text-sm text-text-secondary">—</span>;
  }
  const visibleCashiers = cashiers.slice(0, 3);
  const remainingCashiers = cashiers.slice(3);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleCashiers.map((c) => (
        <Badge key={c.cashier_id} tone={pastelFor(c.cashier_id)}>
          {c.cashier_name}
        </Badge>
      ))}
      {remainingCashiers.length > 0 && (
        <Badge
          tone="neutral"
          title={`Más cajeros: ${remainingCashiers.map((c) => c.cashier_name).join(", ")}`}
          aria-label={`Más cajeros: ${remainingCashiers.map((c) => c.cashier_name).join(", ")}`}
        >
          ...
        </Badge>
      )}
    </div>
  );
}

function SalesReportContent({
  from,
  to,
  activePreset,
  onFromChange,
  onToChange,
  onPresetChange,
}: {
  from: string;
  to: string;
  activePreset: SalesPreset | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPresetChange: (key: SalesPreset) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DAILY_PAGE_SIZE);
  const mobileListRef = useRef<HTMLUListElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);
  const fetcher = useCallback(async () => {
    const [breakdown, summary] = await Promise.all([
      api<DailyBreakdownResponse>(
        `/reports/sales/daily-breakdown?from=${from}&to=${to}&page=${page}&limit=${pageSize}`,
      ),
      api<SalesSummaryByPaymentMethod>(
        `/reports/sales/summary?${buildSummaryQuery({ from, to })}`,
      ),
    ]);
    return { ...breakdown, summary };
  }, [from, page, to, pageSize]);
  const { data, error, reload } = useLoad(fetcher);

  const filters = (
    <SalesReportFilters
      from={from}
      to={to}
      activePreset={activePreset}
      onFromChange={onFromChange}
      onToChange={onToChange}
      onPresetChange={onPresetChange}
    />
  );

  useEffect(() => {
    if (!data || data.days.length === 0) return;
    const recompute = () => {
      const mobile = mobileListRef.current?.getBoundingClientRect();
      const desktop = desktopListRef.current?.getBoundingClientRect();
      const rect = mobile && mobile.height > 0 ? mobile : desktop;
      if (!rect) return;
      const next = computePageSize({ viewportHeight: window.innerHeight, listTop: rect.top, rowHeight: rect.height / data.days.length, reservedBelow: 56, min: 5, max: 15, fallback: DAILY_PAGE_SIZE });
      if (next === pageSize) return;
      setPageSize(next);
      setPage(1);
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [data, pageSize]);

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <ErrorState error={error} onRetry={reload} />
        {filters}
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="flex flex-col gap-6">
        <ListSkeleton rows={6} />
        {filters}
      </div>
    );
  }
  if (data.total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState message="No hay ventas confirmadas en el período seleccionado." />
        {filters}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards data={data.summary} />

      {filters}

      <ul ref={mobileListRef} className="flex flex-col gap-3 md:hidden">
        {data.days.map((day) => (
          <li key={day.date} className="rounded-app border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{formatDayLabel(day.date)}</p>
              <p className="num text-lg font-semibold">{formatMoney(day.total_amount)}</p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-text-secondary">Efectivo</dt><dd className="num">{formatMoney(amountFor(day, "CASH"))}</dd></div>
              <div><dt className="text-text-secondary">Tarjeta</dt><dd className="num">{formatMoney(amountFor(day, "CARD"))}</dd></div>
              <div><dt className="text-text-secondary">Transferencia</dt><dd className="num">{formatMoney(amountFor(day, "TRANSFER"))}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <div ref={desktopListRef} className="hidden md:block">
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Efectivo</Th>
            <Th className="text-right">Tarjeta</Th>
            <Th className="text-right">Transferencia</Th>
            <Th>Cajero(es)</Th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((day) => (
            <tr key={day.date}>
              <Td className="num">{formatDayLabel(day.date)}</Td>
              <Td className="num text-right font-medium">
                {formatMoney(day.total_amount)}
              </Td>
              <Td className="num text-right">
                {formatMoney(amountFor(day, "CASH"))}
              </Td>
              <Td className="num text-right">
                {formatMoney(amountFor(day, "CARD"))}
              </Td>
              <Td className="num text-right">
                {formatMoney(amountFor(day, "TRANSFER"))}
              </Td>
              <Td>
                <CashierPills cashiers={day.cashiers} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      </div>
      {computeTotalPages(data.total, pageSize) > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            Página {data.page} de {computeTotalPages(data.total, pageSize)} · {data.total} días
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={data.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
            <Button variant="secondary" disabled={data.page >= computeTotalPages(data.total, pageSize)} onClick={() => setPage((value) => Math.min(computeTotalPages(data.total, pageSize), value + 1))}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}
