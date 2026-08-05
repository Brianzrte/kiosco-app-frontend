import { describe, expect, it } from "vitest";
import {
  availabilityFromStockError,
  isOutOfStock,
} from "./stockAvailability";

describe("availabilityFromStockError", () => {
  it("keeps a missing stock record as unknown availability", () => {
    expect(availabilityFromStockError(404)).toBeUndefined();
    expect(isOutOfStock(availabilityFromStockError(404))).toBe(false);
  });

  it("keeps non-404 failures as unknown availability", () => {
    expect(availabilityFromStockError(0)).toBeUndefined();
    expect(availabilityFromStockError(403)).toBeUndefined();
    expect(availabilityFromStockError(500)).toBeUndefined();
  });
});

describe("isOutOfStock", () => {
  it("rejects initialized zero or negative stock", () => {
    expect(isOutOfStock(0)).toBe(true);
    expect(isOutOfStock(-0.001)).toBe(true);
  });

  it("allows positive or unknown stock", () => {
    expect(isOutOfStock(0.001)).toBe(false);
    expect(isOutOfStock(undefined)).toBe(false);
  });
});
