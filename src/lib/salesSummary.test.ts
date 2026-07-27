import { describe, expect, it } from "vitest";
import { buildSummaryQuery, normalizeByPaymentMethod } from "./salesSummary";

describe("buildSummaryQuery", () => {
  it("always requests the payment_method breakdown for the given range", () => {
    const query = buildSummaryQuery({ from: "2026-07-27", to: "2026-07-27" });
    const params = new URLSearchParams(query);
    expect(params.get("from")).toBe("2026-07-27");
    expect(params.get("to")).toBe("2026-07-27");
    expect(params.get("group_by")).toBe("payment_method");
  });
});

describe("normalizeByPaymentMethod", () => {
  it("defaults every known method to zero when the response omits it", () => {
    expect(normalizeByPaymentMethod(undefined)).toEqual({
      CASH: { saleCount: 0, totalAmount: "0.00" },
      CARD: { saleCount: 0, totalAmount: "0.00" },
    });
  });

  it("fills in zero for a method absent from a partial response", () => {
    const result = normalizeByPaymentMethod([
      { method: "CASH", sale_count: 5, total_amount: "1200.50" },
    ]);
    expect(result.CASH).toEqual({ saleCount: 5, totalAmount: "1200.50" });
    expect(result.CARD).toEqual({ saleCount: 0, totalAmount: "0.00" });
  });

  it("ignores unknown methods instead of throwing", () => {
    const result = normalizeByPaymentMethod([
      { method: "TRANSFER", sale_count: 2, total_amount: "300.00" },
    ]);
    expect(result.CASH.saleCount).toBe(0);
    expect(result.CARD.saleCount).toBe(0);
  });
});
