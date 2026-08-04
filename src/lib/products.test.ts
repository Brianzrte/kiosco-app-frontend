import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeMarginAmount,
  computeCostFromSalePrice,
  computePercentFromPrices,
  computeProductsPageSize,
  roundPriceToSuggestedAmount,
  computeSalePriceFromCost,
  computeUnitSalePrice,
  computeExtraMarginPercent,
  hasMinimumSalePriceDigits,
  deriveUnitProductName,
  formatUnitSaleCalculation,
  PRODUCTS_DEFAULT_PAGE_SIZE,
  PRODUCTS_MAX_PAGE_SIZE,
  PRODUCTS_MIN_PAGE_SIZE,
  canInitializeStockFromPos,
  getLastCartLineProductId,
} from "./products";

const originalDefaultMarginPercent = process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT;

afterEach(() => {
  if (originalDefaultMarginPercent === undefined) {
    delete process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT;
  } else {
    process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT = originalDefaultMarginPercent;
  }
  vi.resetModules();
});

describe("stock shortcut helpers", () => {
  it("returns the last product in cart order", () => {
    expect(
      getLastCartLineProductId([
        { product: { id: "first" } },
        { product: { id: "last" } },
      ]),
    ).toBe("last");
    expect(getLastCartLineProductId([])).toBeNull();
  });

  it("matches roles that can access inventory", () => {
    expect(canInitializeStockFromPos(["cashier"])).toBe(false);
    expect(canInitializeStockFromPos(["cashier", "inventory"])).toBe(true);
    expect(canInitializeStockFromPos(["admin"])).toBe(true);
  });
});

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

  it("computes cost backwards from a sale price", () => {
    expect(computeCostFromSalePrice("1350.00", 35)).toBe("1000.00");
    expect(computeCostFromSalePrice("100.00", 33)).toBe("75.19");
  });

  it("rejects invalid prices and non-invertible percentages", () => {
    expect(computeCostFromSalePrice("0", 35)).toBeNull();
    expect(computeCostFromSalePrice("", 35)).toBeNull();
    expect(computeCostFromSalePrice("not-money", 35)).toBeNull();
    expect(computeCostFromSalePrice("100.00", Number.NaN)).toBeNull();
    expect(computeCostFromSalePrice("100.00", -100)).toBeNull();
  });

  it("waits for three entered digits before estimating cost", () => {
    expect(hasMinimumSalePriceDigits("9")).toBe(false);
    expect(hasMinimumSalePriceDigits("99")).toBe(false);
    expect(hasMinimumSalePriceDigits("100")).toBe(true);
  });

  it("round-trips a price calculation within cent rounding", () => {
    const price = computeSalePriceFromCost("1000.00", 35);
    expect(price).not.toBeNull();
    expect(computeCostFromSalePrice(price ?? "", 35)).toBe("1000.00");
  });

  it.each([
    [undefined, 35],
    ["40", 40],
    ["", 35],
    ["not-a-number", 35],
  ])("uses the configured default margin for %s", async (value, expected) => {
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT;
    } else {
      process.env.NEXT_PUBLIC_DEFAULT_MARGIN_PERCENT = value;
    }
    vi.resetModules();
    const { DEFAULT_MARGIN_PERCENT } = await import("./products");
    expect(DEFAULT_MARGIN_PERCENT).toBe(expected);
  });
});

describe("unit sale helpers", () => {
  it("calculates the suggested unit price", () => {
    expect(computeUnitSalePrice("500.00", 10, 0)).toBe("50");
    expect(computeUnitSalePrice("7080.00", 10, 20)).toBe("850");
  });

  it("rejects invalid unit sale inputs", () => {
    expect(computeUnitSalePrice("100", 1, 0)).toBeNull();
    expect(computeUnitSalePrice("100", 0, 0)).toBeNull();
    expect(computeUnitSalePrice("100", -2, 0)).toBeNull();
    expect(computeUnitSalePrice("100", 2.5, 0)).toBeNull();
    expect(computeUnitSalePrice("", 2, 0)).toBeNull();
    expect(computeUnitSalePrice("100", 2, -1)).toBeNull();
  });

  it("derives the extra margin from a manually entered unit price", () => {
    const margin = computeExtraMarginPercent("1000.00", 10, "150.00");
    expect(margin).toBe(50);
    expect(computeUnitSalePrice("1000.00", 10, margin ?? 0)).toBe("150");
    expect(computeExtraMarginPercent("0", 10, "50")).toBeNull();
  });

  it("formats the calculation and derives the unit product name", () => {
    expect(formatUnitSaleCalculation("7080.00", 10, 20, "850")).toBe(
      "Base: $ 708,00 · +20% = $ 850,00",
    );
    expect(deriveUnitProductName("Café en sobres   ")).toBe(
      "Café en sobres (unidad)",
    );
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
