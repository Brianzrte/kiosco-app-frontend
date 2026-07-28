import { describe, expect, it } from "vitest";
import { toCents, fromCents, formatMoney, subtractMoney } from "./money";

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

  it("derives split-payment remainders without losing cents", () => {
    const splits: Array<[total: string, entered: string, remainder: string]> = [
      ["0.01", "0.00", "0.01"],
      ["0.05", "0.02", "0.03"],
      ["33.33", "16.67", "16.66"],
      ["73.49", "50.00", "23.49"],
    ];

    for (const [total, entered, remainder] of splits) {
      expect(subtractMoney(total, entered)).toBe(remainder);
      expect(toCents(entered) + toCents(remainder)).toBe(toCents(total));
    }
  });

  it("keeps an overpayment visible as a negative remainder", () => {
    expect(subtractMoney("10.00", "12.50")).toBe("-2.50");
  });

  it("formats money for display", () => {
    expect(formatMoney("12.50")).toBe("$ 12,50");
    expect(formatMoney("1000.00")).toBe("$ 1.000,00");
    expect(formatMoney("1234567.89")).toBe("$ 1.234.567,89");
    expect(formatMoney("-305.00")).toBe("$ -305,00");
  });
});
