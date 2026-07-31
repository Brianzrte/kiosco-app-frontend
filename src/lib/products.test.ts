import { describe, expect, it } from "vitest";
import {
  computeMarginAmount,
  computePercentFromPrices,
  computeProductsPageSize,
  roundPriceToSuggestedAmount,
  computeSalePriceFromCost,
  PRODUCTS_DEFAULT_PAGE_SIZE,
  PRODUCTS_MAX_PAGE_SIZE,
  PRODUCTS_MIN_PAGE_SIZE,
} from "./products";

describe("product pricing helpers", () => {
  it("computes a sale price from cost and percent", () => {
    expect(computeSalePriceFromCost("1250.00", 30)).toBe("1650");
  });

  it("rounds the suggested price up to the next 50 pesos", () => {
    expect(computeSalePriceFromCost("1125.00", 30)).toBe("1500");
    expect(computeSalePriceFromCost("1135.38", 30)).toBe("1500");
  });

  it("normalizes an existing price to the next 50-peso amount", () => {
    expect(roundPriceToSuggestedAmount("1476")).toBe("1500");
    expect(roundPriceToSuggestedAmount("1462")).toBe("1500");
    expect(roundPriceToSuggestedAmount("1")).toBe("50");
  });

  it("returns null for invalid or non-positive costs", () => {
    expect(computeSalePriceFromCost("0", 30)).toBeNull();
    expect(computePercentFromPrices("", "10.00")).toBeNull();
    expect(computeMarginAmount("0", "10.00")).toBeNull();
    expect(computeMarginAmount("not-money", "10.00")).toBeNull();
  });

  it("derives negative percent and margin when price is below cost", () => {
    expect(computePercentFromPrices("100.00", "95.00")).toBe(-5);
    expect(computeMarginAmount("100.00", "95.00")).toBe("-5.00");
  });

  it("rounds the derived percent for display", () => {
    expect(computePercentFromPrices("10.00", "13.33")).toBe(33);
  });
});

describe("computeProductsPageSize", () => {
  const base = {
    viewportHeight: 900,
    listTop: 300,
    rowHeight: 50,
    reservedBelow: 100,
  };

  it("fits the rows in the available viewport height", () => {
    expect(computeProductsPageSize(base)).toBe(10);
  });

  it("clamps to the configured maximum", () => {
    expect(
      computeProductsPageSize({ ...base, viewportHeight: 3000 }),
    ).toBe(PRODUCTS_MAX_PAGE_SIZE);
  });

  it("clamps to the configured minimum", () => {
    expect(computeProductsPageSize({ ...base, viewportHeight: 500 })).toBe(
      PRODUCTS_MIN_PAGE_SIZE,
    );
  });

  it("uses the fallback before a row height is measurable", () => {
    expect(computeProductsPageSize({ ...base, rowHeight: 0 })).toBe(
      PRODUCTS_DEFAULT_PAGE_SIZE,
    );
  });
});
