import type { PaymentInput } from "./paymentComposition";
import type { CartLine } from "./cart";
import type { Sale } from "./types";

export type SaleItemPayload =
  | { product_id: string; quantity: number }
  | { product_id: string; weight: string; actual_price?: string };

/** Same shape `confirmSale()` already sends today for each cart line. */
export function cartLineToSaleItemPayload(line: CartLine): SaleItemPayload {
  if (line.product.unit_type === "pesable") {
    return {
      product_id: line.product.id,
      weight: line.weight ?? "",
      ...(line.actualPrice ? { actual_price: line.actualPrice } : {}),
    };
  }
  return { product_id: line.product.id, quantity: line.quantity };
}

export type SubmitSaleDeps = {
  createSale: () => Promise<{ id: string }>;
  addSaleItem: (saleId: string, item: SaleItemPayload) => Promise<unknown>;
  setSalePayment: (saleId: string, payments: PaymentInput[]) => Promise<unknown>;
  confirmSale: (saleId: string) => Promise<Sale>;
};

export type SubmitSaleInput = {
  cart: readonly CartLine[];
  paymentPayload: readonly PaymentInput[];
  /** A sale `id` already retained from a previous attempt, if any. */
  existingSaleId?: string | null;
  /**
   * Called synchronously as soon as `createSale()` resolves, before any
   * later step runs. Lets the caller retain the `id` in component state even
   * if a subsequent step (items, payment, confirm) then fails — the guard
   * against duplicating the draft (design.md, Decisión 12).
   */
  onSaleCreated?: (saleId: string) => void;
};

/**
 * The confirmation sequence (create sale → items → payment → confirm),
 * parameterized by injected network functions so it can be tested without
 * `fetch`. Reuses `existingSaleId` instead of creating a new sale when one
 * is already retained from an earlier attempt — a retry after a partial
 * failure never duplicates the draft.
 */
export async function submitSale(
  input: SubmitSaleInput,
  deps: SubmitSaleDeps,
): Promise<Sale> {
  let saleId = input.existingSaleId ?? null;
  if (!saleId) {
    const sale = await deps.createSale();
    saleId = sale.id;
    input.onSaleCreated?.(saleId);
  }
  for (const line of input.cart) {
    await deps.addSaleItem(saleId, cartLineToSaleItemPayload(line));
  }
  await deps.setSalePayment(saleId, [...input.paymentPayload]);
  return deps.confirmSale(saleId);
}
