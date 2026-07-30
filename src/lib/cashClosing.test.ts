import { describe, expect, it } from "vitest";
import { cashDifference, isCountedCash } from "./cashClosing";

describe("cash closing amounts", () => {
  it("accepts non-negative decimal strings with up to two fraction digits", () => {
    expect(isCountedCash("0")).toBe(true);
    expect(isCountedCash("1234.50")).toBe(true);
    expect(isCountedCash("12.345")).toBe(false);
    expect(isCountedCash("-1.00")).toBe(false);
    expect(isCountedCash("abc")).toBe(false);
  });

  it("calculates the difference through integer cents", () => {
    expect(cashDifference("100.10", "99.99")).toBe("-0.11");
    expect(cashDifference("100.10", "101.00")).toBe("0.90");
    expect(cashDifference("100.10", "100.10")).toBe("0.00");
  });

  it("does not calculate a difference for invalid input", () => {
    expect(cashDifference("100.00", "100.001")).toBeNull();
  });
});
