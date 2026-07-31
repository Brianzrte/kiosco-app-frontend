import {
  calculateWeightedPrice,
  effectiveLinePrice,
  isValidWeight,
} from "./weightPricing";
import { describe, expect, it } from "vitest";

describe("weight pricing", () => {
  it("calculates weighted prices to the nearest cent without float drift", () => {
    expect(calculateWeightedPrice("1.500", "100.00")).toBe("150.00");
    expect(calculateWeightedPrice("0.001", "12.50")).toBe("0.01");
    expect(calculateWeightedPrice("1.234", "10.00")).toBe("12.34");
  });

  it("uses the actual price when one was entered", () => {
    expect(effectiveLinePrice("150.00", "140.00")).toBe("140.00");
    expect(effectiveLinePrice("150.00")).toBe("150.00");
  });

  it("accepts positive weights up to three decimals", () => {
    expect(isValidWeight("1")).toBe(true);
    expect(isValidWeight("1.234")).toBe(true);
    expect(isValidWeight("0.001")).toBe(true);
    expect(isValidWeight("0")).toBe(false);
    expect(isValidWeight("-1")).toBe(false);
    expect(isValidWeight("1.2345")).toBe(false);
    expect(isValidWeight("abc")).toBe(false);
  });
});
