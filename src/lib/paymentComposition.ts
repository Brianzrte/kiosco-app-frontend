import { subtractMoney } from "./money";

export type SplitPaymentMethod = "CASH" | "CARD";

export type PaymentInput = {
  method: SplitPaymentMethod;
  amount: string;
};

function otherMethod(method: SplitPaymentMethod): SplitPaymentMethod {
  return method === "CASH" ? "CARD" : "CASH";
}

/**
 * Builds the two payments for a split sale. The cashier supplies one amount;
 * the other payment is always the exact remainder of the sale total.
 */
export function composeSplitPayment(
  total: string,
  enteredMethod: SplitPaymentMethod,
  enteredAmount: string,
): PaymentInput[] {
  return [
    { method: enteredMethod, amount: enteredAmount },
    {
      method: otherMethod(enteredMethod),
      amount: subtractMoney(total, enteredAmount),
    },
  ];
}
