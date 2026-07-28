/**
 * Pure helpers for the v1.5 report charts (`ReportsView.tsx`). The backend
 * aggregates by day, cashier, and product — nothing here recomputes or
 * regroups those aggregates. The two things this module does are purely
 * display concerns: filling a chart's date axis and folding a long tail of
 * bars into "Otros", both explicitly scoped to the chart only (the table
 * next to each chart always shows the backend's rows unmodified).
 */

import { fromCents, toCents } from "./money";

export type DailySalesRow = {
  date: string;
  total_sales: number;
  total_amount: string;
};

export type CashierSalesItem = {
  cashier_id: string;
  cashier_name: string;
  total_sales: number;
  total_revenue: string;
};

export type ProductSalesItem = {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: string;
};

/**
 * Steps a plain "YYYY-MM-DD" string by `delta` calendar days, using `Date.UTC`
 * purely as a calendar calculator — never as a timezone conversion. This is
 * the one place date arithmetic happens on backend-supplied day strings;
 * every caller below reuses it instead of constructing its own `Date`.
 */
export function addDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + delta);
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Number of calendar days from `from` to `to`, both inclusive. */
function daysBetweenInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return Math.round((toUTC - fromUTC) / 86_400_000) + 1;
}

/**
 * One entry per calendar day between `from` and `to` (both inclusive),
 * taking amounts from `rows` where present and zero where the backend
 * omitted the day (its documented meaning: zero confirmed sales that day).
 * Dates are plain "YYYY-MM-DD" strings, matched and stepped without ever
 * constructing a browser-local `Date` from them — the backend already
 * resolved the business timezone, and reparsing here would risk a second,
 * divergent definition of "day".
 */
export function fillDailySeries(
  rows: DailySalesRow[],
  from: string,
  to: string,
): DailySalesRow[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const result: DailySalesRow[] = [];
  let cursor = from;
  while (cursor <= to) {
    result.push(
      byDate.get(cursor) ?? {
        date: cursor,
        total_sales: 0,
        total_amount: "0.00",
      },
    );
    cursor = addDays(cursor, 1);
  }
  return result;
}

/**
 * The range immediately preceding `{from, to}`, of the same length in days —
 * e.g. for a 7-day range, the 7 days ending the day before `from`. Used to
 * compare two backend-computed totals; never to regroup anything client-side.
 */
export function previousPeriodRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const length = daysBetweenInclusive(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(length - 1));
  return { from: prevFrom, to: prevTo };
}

/** How the selected range compares to the previous one of equal length. */
export type PeriodComparison =
  | { kind: "changed"; percent: number }
  | { kind: "previous_empty" }
  | { kind: "both_empty" };

/**
 * Compares two already-aggregated totals (in cents) — never derives either
 * one from a raw sales listing. `previousCents === 0` with a non-zero
 * current total would divide by zero, so it is reported as its own case
 * instead of an infinite or undefined percentage.
 */
export function comparePeriods(
  currentCents: number,
  previousCents: number,
): PeriodComparison {
  if (currentCents === 0 && previousCents === 0) return { kind: "both_empty" };
  if (previousCents === 0) return { kind: "previous_empty" };
  return {
    kind: "changed",
    percent: ((currentCents - previousCents) / previousCents) * 100,
  };
}

/** "el día anterior" / "los N días anteriores", named by the range's own length. */
export function periodLengthLabel(days: number): string {
  return days === 1 ? "el día anterior" : `los ${days} días anteriores`;
}

/** Today as a plain "YYYY-MM-DD" string, in the browser's local calendar. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type RangePreset = "week" | "month" | "six_months";

const PRESET_DAYS: Record<RangePreset, number> = {
  week: 7,
  month: 30,
  six_months: 183,
};

/**
 * Rolling window of fixed length ending today — never a calendar-aligned
 * period ("this week", "this month"), matching the rule that a preset must
 * never assert a calendar period the range does not actually span
 * (`design.md`, period comparison decision).
 */
export function presetRange(preset: RangePreset): {
  from: string;
  to: string;
} {
  const to = today();
  const from = addDays(to, -(PRESET_DAYS[preset] - 1));
  return { from, to };
}

const OTROS_ID = "__otros__";

/**
 * Top `(maxBars - 1)` products by revenue, plus a single "Otros" entry
 * summing the rest — only when there are more than `maxBars` products to
 * begin with. Chart-only: the caller's table keeps showing every row from
 * `products` untouched.
 */
export function foldProductsIntoOtros(
  products: ProductSalesItem[],
  maxBars: number,
): ProductSalesItem[] {
  if (products.length <= maxBars) return products;

  const sorted = [...products].sort(
    (a, b) => toCents(b.total_revenue) - toCents(a.total_revenue),
  );
  const head = sorted.slice(0, maxBars - 1);
  const tail = sorted.slice(maxBars - 1);

  const otrosCents = tail.reduce((sum, p) => sum + toCents(p.total_revenue), 0);
  const otrosQuantity = tail.reduce((sum, p) => sum + p.total_quantity, 0);

  return [
    ...head,
    {
      product_id: OTROS_ID,
      product_name: "Otros",
      total_quantity: otrosQuantity,
      total_revenue: fromCents(otrosCents),
    },
  ];
}
