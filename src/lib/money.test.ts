import { describe, expect, it } from "vitest";
import { toCents, fromCents, formatMoney } from "./money";

describe("money", () => {
  it("converts decimal strings to cents", () => {
    expect(toCents("12.50")).toBe(1250);
    expect(toCents("0.01")).toBe(1);
    expect(toCents("-3.05")).toBe(-305);
  });

  it("converts cents back to decimal strings", () => {
    expect(fromCents(1250)).toBe("12.50");
    expect(fromCents(1)).toBe("0.01");
    expect(fromCents(-305)).toBe("-3.05");
  });

  it("formats money for display", () => {
    expect(formatMoney("12.50")).toBe("$ 12.50");
  });
});
