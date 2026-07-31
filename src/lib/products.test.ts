import { describe, expect, it } from "vitest";
import {
  computeProductsPageSize,
  PRODUCTS_DEFAULT_PAGE_SIZE,
  PRODUCTS_MAX_PAGE_SIZE,
  PRODUCTS_MIN_PAGE_SIZE,
} from "./products";

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
