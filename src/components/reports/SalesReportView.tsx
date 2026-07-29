"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Badge, pastelFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney, fromCents, toCents } from "@/lib/money";
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
type DailyBreakdownResponse = { days: DailyBreakdownRow[] };

/** Amount for `method` on `row`, zero when the backend didn't report it —
 * columns must stay aligned across rows (ui-reports-detail). */
function amountFor(row: DailyBreakdownRow, method: string): string {
  return (
    row.by_payment_method.find((m) => m.method === method)?.total_amount ??
    "0.00"
  );
}

/**
 * Range totals for the summary cards, summed from `days` — the same
 * complete (non-paginated) backend-aggregated rows already fetched for the
 * table, never from a raw or paginated sales listing.
 */
function summarizeDays(days: DailyBreakdownRow[]) {
  let totalSales = 0;
  let totalCents = 0;
  let cashCents = 0;
  let cardCents = 0;
  let transferCents = 0;
  for (const day of days) {
    totalSales += day.total_sales;
    totalCents += toCents(day.total_amount);
    cashCents += toCents(amountFor(day, "CASH"));
    cardCents += toCents(amountFor(day, "CARD"));
    transferCents += toCents(amountFor(day, "TRANSFER"));
  }
  return {
    totalSales,
    totalAmount: fromCents(totalCents),
    cash: fromCents(cashCents),
    card: fromCents(cardCents),
    transfer: fromCents(transferCents),
  };
}

function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

type DayPreset = "today" | "yesterday";

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

  function applyDayPreset(key: DayPreset) {
    const day = key === "today" ? today() : addDays(today(), -1);
    setFrom(day);
    setTo(day);
  }

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

      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Reporte de ventas</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {DAY_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="secondary"
              onClick={() => applyDayPreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="secondary"
              onClick={() => {
                const range = presetRange(preset.key);
                setFrom(range.from);
                setTo(range.to);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
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

      <SalesReportContent key={`${from}-${to}`} from={from} to={to} />
    </div>
  );
}

function SummaryTiles({ days }: { days: DailyBreakdownRow[] }) {
  const summary = summarizeDays(days);
  const tiles = [
    { label: "Ventas", value: String(summary.totalSales) },
    { label: "Total facturado", value: formatMoney(summary.totalAmount) },
    { label: "Efectivo", value: formatMoney(summary.cash) },
    { label: "Tarjeta", value: formatMoney(summary.card) },
    { label: "Transferencia", value: formatMoney(summary.transfer) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <p className="text-sm text-text-secondary">{tile.label}</p>
          <p className="num mt-1 text-2xl font-semibold">{tile.value}</p>
        </Card>
      ))}
    </div>
  );
}

function CashierPills({ cashiers }: { cashiers: CashierBreakdown[] }) {
  if (cashiers.length === 0) {
    return <span className="text-sm text-text-secondary">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {cashiers.map((c) => (
        <Badge key={c.cashier_id} tone={pastelFor(c.cashier_id)}>
          {c.cashier_name}
        </Badge>
      ))}
    </div>
  );
}

function SalesReportContent({ from, to }: { from: string; to: string }) {
  const fetcher = useCallback(
    () =>
      api<DailyBreakdownResponse>(
        `/reports/sales/daily-breakdown?from=${from}&to=${to}`,
      ),
    [from, to],
  );
  const { data, error, reload } = useLoad(fetcher);
  const days = data?.days ?? null;

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (days === null) return <ListSkeleton rows={6} />;
  if (days.length === 0) {
    return (
      <EmptyState message="No hay ventas confirmadas en el período seleccionado." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryTiles days={days} />

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
          {days.map((day) => (
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
  );
}
