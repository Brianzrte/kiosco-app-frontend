import { describe, expect, it } from "vitest";
import {
  buildMovementsQuery,
  buildStockQuery,
  isDeepLinkedProductId,
  computeInventoryPageSize,
  computeTotalPages,
  isRowLow,
} from "./inventory";

describe("isDeepLinkedProductId", () => {
  it("accepts non-empty raw query values without normalizing them", () => {
    expect(isDeepLinkedProductId("product-1")).toBe(true);
    expect(isDeepLinkedProductId("  product-1  ")).toBe(true);
  });

  it("rejects missing and empty query values", () => {
    expect(isDeepLinkedProductId(null)).toBe(false);
    expect(isDeepLinkedProductId("")).toBe(false);
    expect(isDeepLinkedProductId("   ")).toBe(false);
  });
});

describe("buildStockQuery", () => {
  it("omits empty filters", () => {
    expect(
      buildStockQuery({
        search: "",
        categoryId: "",
        lowStockOnly: false,
        page: 1,
        limit: 20,
      }),
    ).toBe("page=1&limit=20");
  });

  it("includes search, category and low_stock_only when set", () => {
    const query = buildStockQuery({
      search: "coca",
      categoryId: "cat-1",
      lowStockOnly: true,
      page: 2,
      limit: 20,
    });
    const params = new URLSearchParams(query);
    expect(params.get("search")).toBe("coca");
    expect(params.get("category_id")).toBe("cat-1");
    expect(params.get("low_stock_only")).toBe("true");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("20");
  });

  it("uses page, never offset — the backend silently defaults to page 1 on an unknown param", () => {
    const query = buildStockQuery({
      search: "",
      categoryId: "",
      lowStockOnly: false,
      page: 3,
      limit: 20,
    });
    expect(query).toContain("page=3");
    expect(query).not.toContain("offset");
  });
});

describe("buildMovementsQuery", () => {
  it("omits empty filters", () => {
    expect(
      buildMovementsQuery({
        productId: "",
        type: "",
        from: "",
        to: "",
        page: 1,
      }),
    ).toBe("page=1");
  });

  it("includes every filter when set", () => {
    const query = buildMovementsQuery({
      productId: "prod-1",
      type: "ADJUSTMENT_IN",
      from: "2026-01-01",
      to: "2026-01-31",
      page: 2,
    });
    const params = new URLSearchParams(query);
    expect(params.get("product_id")).toBe("prod-1");
    expect(params.get("type")).toBe("ADJUSTMENT_IN");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-01-31");
    expect(params.get("page")).toBe("2");
  });
});

describe("computeTotalPages", () => {
  it("is always at least 1, even with zero results", () => {
    expect(computeTotalPages(0, 20)).toBe(1);
  });

  it("rounds up partial pages", () => {
    expect(computeTotalPages(21, 20)).toBe(2);
    expect(computeTotalPages(20, 20)).toBe(1);
    expect(computeTotalPages(41, 20)).toBe(3);
  });
});

describe("computeInventoryPageSize", () => {
  it("fits as many rows as the leftover viewport height allows", () => {
    // 900 - 300 (listTop) - 100 (reserved) = 500px available / 50px rows = 10
    expect(
      computeInventoryPageSize({
        viewportHeight: 900,
        listTop: 300,
        rowHeight: 50,
        reservedBelow: 100,
      }),
    ).toBe(10);
  });

  it("clamps to 15 on a tall viewport, even if more rows would fit", () => {
    expect(
      computeInventoryPageSize({
        viewportHeight: 3000,
        listTop: 300,
        rowHeight: 50,
        reservedBelow: 100,
      }),
    ).toBe(15);
  });

  it("clamps to 5 on a very short viewport rather than force a scroll", () => {
    expect(
      computeInventoryPageSize({
        viewportHeight: 500,
        listTop: 300,
        rowHeight: 50,
        reservedBelow: 100,
      }),
    ).toBe(5);
  });

  it("returns the plain fit when it falls between the 5 and 15 clamps", () => {
    // 900 - 300 - 100 = 500px available / 67px rows = 7 (not clamped)
    expect(
      computeInventoryPageSize({
        viewportHeight: 900,
        listTop: 300,
        rowHeight: 67,
        reservedBelow: 100,
      }),
    ).toBe(7);
  });

  it("falls back to the default when rowHeight isn't measurable yet", () => {
    expect(
      computeInventoryPageSize({
        viewportHeight: 900,
        listTop: 300,
        rowHeight: 0,
        reservedBelow: 100,
      }),
    ).toBe(15);
  });
});

describe("isRowLow", () => {
  it("is never low when stock isn't initialized, regardless of filters", () => {
    expect(isRowLow(false, true, true)).toBe(false);
    expect(isRowLow(false, false, true)).toBe(false);
  });

  it("is low for every row when the low_stock_only filter is active", () => {
    expect(isRowLow(true, true, false)).toBe(true);
  });

  it("otherwise defers entirely to backend-set membership", () => {
    expect(isRowLow(true, false, true)).toBe(true);
    expect(isRowLow(true, false, false)).toBe(false);
  });
});
