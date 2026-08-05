/**
 * Each POS status region shows at most one message at a time, picked by a
 * fixed priority (design.md, Decisión 10). These are pure "which message
 * wins" resolvers: they take already-computed candidate messages/flags and
 * return the single one that should render, or `null`. Formatting, tone and
 * `role="alert"` are the consuming component's concern, not this module's.
 */

export type EntryStatusInput = {
  /** 404 on the last barcode submission, or an equivalent unknown-code text. */
  unknownBarcodeMessage: string | null;
  /** A scanned/selected product exists but is inactive. */
  inactiveProductMessage: string | null;
  /** A stock cap was applied and needs to be explained. */
  stockLimitMessage: string | null;
  /** A product search request failed. */
  searchErrorMessage: string | null;
  /** "Buscando…" / "Ningún producto activo coincide…", already resolved by the caller. */
  searchStatusMessage: string | null;
};

/**
 * Entry region (below the scan/search inputs). Priority, highest to lowest:
 * unknown barcode > inactive product > stock limit > search error > search
 * status.
 */
export function resolveEntryStatus(input: EntryStatusInput): string | null {
  return (
    input.unknownBarcodeMessage ??
    input.inactiveProductMessage ??
    input.stockLimitMessage ??
    input.searchErrorMessage ??
    input.searchStatusMessage ??
    null
  );
}

export type CheckoutStatusKind =
  | "network"
  | "confirmError"
  | "balance"
  | "blocked"
  | "settled";

export type CheckoutStatusResult = {
  kind: CheckoutStatusKind;
  message: string;
};

export type CheckoutStatusInput = {
  /** `true` when the last confirmation attempt failed with an unknown network state (`status === 0`). */
  unknownNetworkState: boolean;
  unknownNetworkMessage: string;
  /** Set after a failed confirmation attempt; cleared on a fresh attempt. */
  confirmErrorMessage: string | null;
  /** Non-null while a payment method is chosen but the payment amounts don't balance the total yet. */
  pendingBalanceMessage: string | null;
  /** Non-null while confirmation is disabled for a validation reason (empty cart, invalid weight, no payment method chosen, etc). */
  confirmDisabledReason: string | null;
  /** Shown once nothing above applies — payment is chosen and balanced, confirmation is not disabled. */
  settledMessage: string;
};

/**
 * Checkout region (between the payment block and "Confirmar venta").
 * Priority, highest to lowest: unknown network state > confirmation error >
 * pending payment balance > confirmation-blocked reason > settled message
 * ("Pago cerrado").
 */
export function resolveCheckoutStatus(
  input: CheckoutStatusInput,
): CheckoutStatusResult {
  if (input.unknownNetworkState) {
    return { kind: "network", message: input.unknownNetworkMessage };
  }
  if (input.confirmErrorMessage) {
    return { kind: "confirmError", message: input.confirmErrorMessage };
  }
  if (input.pendingBalanceMessage) {
    return { kind: "balance", message: input.pendingBalanceMessage };
  }
  if (input.confirmDisabledReason) {
    return { kind: "blocked", message: input.confirmDisabledReason };
  }
  return { kind: "settled", message: input.settledMessage };
}
