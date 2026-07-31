/**
 * Pure helpers for the payment-method breakdown used by the summary cards
 * and the cash-closing tool on `/sales`. The aggregation itself always comes
 * from `GET /reports/sales/summary?group_by=payment_method` — this module
 * only builds the query and fills in zero for a method with no sales in the
 * range, never derives totals from individual sales.
 */

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentMethodBreakdown = {
  method: string;
  sale_count: number;
  total_amount: string;
};

export type SalesSummaryByPaymentMethod = {
  total_sales: number;
  total_amount: string;
  by_payment_method?: PaymentMethodBreakdown[];
};

export type NormalizedBreakdown = Record<
  PaymentMethod,
  { saleCount: number; totalAmount: string }
>;

export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function buildSummaryQuery(opts: { from: string; to: string }): string {
  const params = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    group_by: "payment_method",
  });
  return params.toString();
}

export function todayISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

/** Every known method always present, defaulting to zero when absent from the response. */
export function normalizeByPaymentMethod(
  rows: PaymentMethodBreakdown[] | undefined,
): NormalizedBreakdown {
  const base = Object.fromEntries(
    PAYMENT_METHODS.map((method) => [method, { saleCount: 0, totalAmount: "0.00" }]),
  ) as NormalizedBreakdown;
  for (const row of rows ?? []) {
    if ((PAYMENT_METHODS as readonly string[]).includes(row.method)) {
      base[row.method as PaymentMethod] = {
        saleCount: row.sale_count,
        totalAmount: row.total_amount,
      };
    }
  }
  return base;
}
