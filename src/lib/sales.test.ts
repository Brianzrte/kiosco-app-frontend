import { describe, expect, it } from "vitest";
import {
  computeSalesPageSize,
  paymentMethodTone,
  SALES_DEFAULT_PAGE_SIZE,
  SALES_MAX_PAGE_SIZE,
  SALES_MIN_PAGE_SIZE,
} from "./sales";

describe("computeSalesPageSize", () => {
  const base = {
    viewportHeight: 900,
    listTop: 300,
    rowHeight: 50,
    reservedBelow: 100,
  };

  it("fits the rows in the available viewport height", () => {
    expect(computeSalesPageSize(base)).toBe(10);
  });

  it("clamps to Sales' maximum", () => {
    expect(computeSalesPageSize({ ...base, viewportHeight: 3000 })).toBe(
      SALES_MAX_PAGE_SIZE,
    );
  });

  it("clamps to Sales' minimum", () => {
    expect(computeSalesPageSize({ ...base, viewportHeight: 500 })).toBe(
      SALES_MIN_PAGE_SIZE,
    );
  });

  it("uses Sales' default before a row height is measurable", () => {
    expect(computeSalesPageSize({ ...base, rowHeight: 0 })).toBe(
      SALES_DEFAULT_PAGE_SIZE,
    );
  });
});

describe("paymentMethodTone", () => {
  it.each([
    ["CASH", "payment-cash"],
    ["CARD", "payment-card"],
    ["TRANSFER", "payment-transfer"],
  ] as const)("maps %s to %s", (method, tone) => {
    expect(paymentMethodTone(method)).toBe(tone);
  });
});
