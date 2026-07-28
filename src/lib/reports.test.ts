import { describe, expect, it, vi } from "vitest";
import {
  comparePeriods,
  fillDailySeries,
  foldProductsIntoOtros,
  periodLengthLabel,
  presetRange,
  previousPeriodRange,
  type ProductSalesItem,
} from "./reports";

describe("fillDailySeries", () => {
  it("keeps rows the backend returned", () => {
    const rows = [
      { date: "2026-07-02", total_sales: 3, total_amount: "45.00" },
    ];
    const result = fillDailySeries(rows, "2026-07-02", "2026-07-02");
    expect(result).toEqual(rows);
  });

  it("fills an omitted day with zero, without dropping the range's edges", () => {
    const rows = [
      { date: "2026-07-01", total_sales: 2, total_amount: "20.00" },
      { date: "2026-07-03", total_sales: 1, total_amount: "10.00" },
    ];
    const result = fillDailySeries(rows, "2026-07-01", "2026-07-03");
    expect(result).toEqual([
      { date: "2026-07-01", total_sales: 2, total_amount: "20.00" },
      { date: "2026-07-02", total_sales: 0, total_amount: "0.00" },
      { date: "2026-07-03", total_sales: 1, total_amount: "10.00" },
    ]);
  });

  it("steps across a month boundary without a UTC/local timezone shift", () => {
    const result = fillDailySeries([], "2026-01-30", "2026-02-02");
    expect(result.map((r) => r.date)).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("returns an empty series when the range is empty", () => {
    expect(fillDailySeries([], "2026-07-02", "2026-07-01")).toEqual([]);
  });
});

describe("foldProductsIntoOtros", () => {
  const product = (id: string, revenue: string, qty = 1): ProductSalesItem => ({
    product_id: id,
    product_name: id,
    total_quantity: qty,
    total_revenue: revenue,
  });

  it("returns the list untouched when it fits within maxBars", () => {
    const products = [product("a", "10.00"), product("b", "5.00")];
    expect(foldProductsIntoOtros(products, 8)).toEqual(products);
  });

  it("folds the tail into a single Otros bar sorted by revenue", () => {
    const products = [
      product("a", "10.00", 1),
      product("b", "50.00", 2),
      product("c", "5.00", 3),
      product("d", "1.00", 4),
    ];
    const result = foldProductsIntoOtros(products, 3);
    expect(result).toHaveLength(3);
    expect(result[0].product_id).toBe("b");
    expect(result[1].product_id).toBe("a");
    expect(result[2]).toEqual({
      product_id: "__otros__",
      product_name: "Otros",
      total_quantity: 3 + 4,
      total_revenue: "6.00",
    });
  });
});

describe("previousPeriodRange", () => {
  it("returns the equal-length range ending the day before `from`", () => {
    expect(previousPeriodRange("2026-07-08", "2026-07-14")).toEqual({
      from: "2026-07-01",
      to: "2026-07-07",
    });
  });

  it("handles a single-day range", () => {
    expect(previousPeriodRange("2026-07-15", "2026-07-15")).toEqual({
      from: "2026-07-14",
      to: "2026-07-14",
    });
  });

  it("steps across a month boundary", () => {
    expect(previousPeriodRange("2026-03-01", "2026-03-03")).toEqual({
      from: "2026-02-26",
      to: "2026-02-28",
    });
  });

  it("steps across a year boundary", () => {
    expect(previousPeriodRange("2026-01-01", "2026-01-02")).toEqual({
      from: "2025-12-30",
      to: "2025-12-31",
    });
  });
});

describe("comparePeriods", () => {
  it("reports a positive percent when revenue increased", () => {
    const result = comparePeriods(15_000, 10_000);
    expect(result).toEqual({ kind: "changed", percent: 50 });
  });

  it("reports a negative percent when revenue decreased", () => {
    const result = comparePeriods(5_000, 10_000);
    expect(result).toEqual({ kind: "changed", percent: -50 });
  });

  it("reports previous_empty when the previous period had no sales", () => {
    expect(comparePeriods(10_000, 0)).toEqual({ kind: "previous_empty" });
  });

  it("reports both_empty when neither period had sales", () => {
    expect(comparePeriods(0, 0)).toEqual({ kind: "both_empty" });
  });
});

describe("periodLengthLabel", () => {
  it("names a single day distinctly from a multi-day range", () => {
    expect(periodLengthLabel(1)).toBe("el día anterior");
    expect(periodLengthLabel(7)).toBe("los 7 días anteriores");
  });
});

describe("presetRange", () => {
  it("returns a rolling window of fixed length ending today, never a calendar-aligned period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    try {
      expect(presetRange("week")).toEqual({
        from: "2026-07-09",
        to: "2026-07-15",
      });
      expect(presetRange("month")).toEqual({
        from: "2026-06-16",
        to: "2026-07-15",
      });
      expect(presetRange("six_months")).toEqual({
        from: "2026-01-14",
        to: "2026-07-15",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
