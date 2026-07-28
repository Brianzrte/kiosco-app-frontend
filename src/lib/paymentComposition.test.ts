import { describe, expect, it } from "vitest";
import { toCents } from "./money";
import { composeSplitPayment } from "./paymentComposition";

describe("composeSplitPayment", () => {
  it("assigns the exact remainder to the other payment", () => {
    expect(composeSplitPayment("73.49", "CASH", "50.00")).toEqual([
      { method: "CASH", amount: "50.00" },
      { method: "CARD", amount: "23.49" },
    ]);
  });

  it.each([
    ["0.01", "CASH", "0.00"],
    ["0.05", "CARD", "0.02"],
    ["33.33", "CASH", "16.67"],
    ["73.49", "CARD", "50.00"],
  ] as const)(
    "keeps %s balanced when %s receives %s",
    (total, enteredMethod, enteredAmount) => {
      const payments = composeSplitPayment(total, enteredMethod, enteredAmount);

      expect(payments[0].method).toBe(enteredMethod);
      expect(payments[0].amount).toBe(enteredAmount);
      expect(payments[0].method).not.toBe(payments[1].method);
      expect(toCents(payments[0].amount) + toCents(payments[1].amount)).toBe(
        toCents(total),
      );
    },
  );
});
