import { fromCents, toCents } from "./money";

export type SplitPaymentMethod = "CASH" | "CARD" | "TRANSFER";
type SplitCompositionMethod = Exclude<SplitPaymentMethod, "TRANSFER">;

export type PaymentInput = {
  method: SplitPaymentMethod;
  amount: string;
};

export type SplitPaymentInput = PaymentInput & {
  method: SplitCompositionMethod;
};

export type PaymentBalance = {
  /** Positive means the sale is still short; negative means it is overpaid. */
  differenceCents: number;
  hasNumericAmounts: boolean;
  hasValidAmounts: boolean;
};

/**
 * Backend money is a non-negative decimal string with at most two fraction
 * digits. The POS keeps the exact string for submission, so invalid text must
 * never be coerced into a different amount before the cashier corrects it.
 */
export function isMoneyAmount(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value);
}

export function getPaymentBalance(
  total: string,
  payments: PaymentInput[],
): PaymentBalance {
  const validAmounts = payments.length > 0 && payments.every((payment) =>
    isMoneyAmount(payment.amount),
  );

  if (!validAmounts) {
    return {
      differenceCents: 0,
      hasNumericAmounts: false,
      hasValidAmounts: false,
    };
  }

  const differenceCents =
    toCents(total) -
    payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);

  return {
    differenceCents,
    hasNumericAmounts: true,
    hasValidAmounts: payments.every((payment) => toCents(payment.amount) > 0),
  };
}

/**
 * The split composer deliberately remains binary: transfer is a single,
 * whole-total payment only. Keep it out of this helper until a future change
 * defines how to choose among more than two split methods.
 */
function otherMethod(method: SplitCompositionMethod): SplitCompositionMethod {
  return method === "CASH" ? "CARD" : "CASH";
}

/**
 * Builds the two payments for a split sale. The cashier supplies one amount;
 * the other payment is always the exact remainder of the sale total.
 */
export function composeSplitPayment(
  total: string,
  enteredMethod: SplitCompositionMethod,
  enteredAmount: string,
): SplitPaymentInput[] {
  const remainder = isMoneyAmount(enteredAmount)
    ? fromCents(Math.max(toCents(total) - toCents(enteredAmount), 0))
    : "";

  return [
    { method: enteredMethod, amount: enteredAmount },
    {
      method: otherMethod(enteredMethod),
      amount: remainder,
    },
  ];
}
