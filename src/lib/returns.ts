/**
 * Pure helpers for registering and displaying sale returns.
 *
 * The available-quantity limit ("vendido menos ya devuelto") is arithmetic
 * over two backend-authoritative sources — GET /sales/{id} (quantity sold
 * per item) and GET /sales/{id}/returns (quantities already returned) — not
 * a business rule invented here (design.md). The backend re-validates the
 * real limit under a transactional lock at confirm time regardless; this
 * module only mirrors it so the form can show a sane bound before choosing.
 */

import { fromCents, toCents } from "./money";
import { Return, SaleItem, SalePayment } from "./types";
import {
  calculateWeightedPrice,
  isValidWeight,
  weightThousandths,
} from "./weightPricing";

export type ReturnAvailability = {
  saleItemId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  measure: "unit" | "weight";
  sold: number;
  alreadyReturned: number;
  available: number;
};

/** Total merchandise value across all returns already registered for a sale. */
export function sumReturnedTotal(returns: Return[]): string {
  const cents = returns.reduce(
    (sum, ret) => sum + toCents(ret.total_amount),
    0,
  );
  return fromCents(cents);
}

/** Sale total net of everything already returned — never negative. */
export function computeNetTotal(saleTotal: string, returns: Return[]): string {
  const net = toCents(saleTotal) - toCents(sumReturnedTotal(returns));
  return fromCents(Math.max(0, net));
}

export function sumReturnedByItem(returns: Return[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const ret of returns) {
    for (const item of ret.items) {
      const amount = item.weight === undefined
        ? (item.quantity ?? 0)
        : Number(item.weight);
      map.set(
        item.sale_item_id,
        (map.get(item.sale_item_id) ?? 0) + amount,
      );
    }
  }
  return map;
}

export function computeAvailability(
  items: SaleItem[],
  returns: Return[],
): ReturnAvailability[] {
  const returnedByItem = sumReturnedByItem(returns);
  return items.map((item) => {
    const measure = item.weight === undefined ? "unit" : "weight";
    const sold = measure === "unit" ? item.quantity : Number(item.weight);
    const alreadyReturned = returnedByItem.get(item.id) ?? 0;
    const available = measure === "unit"
      ? Math.max(0, sold - alreadyReturned)
      : Math.max(
          0,
          (weightThousandths(item.weight!) - Math.round(alreadyReturned * 1000)) / 1000,
        );
    return {
      saleItemId: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: item.unit_price,
      measure,
      sold,
      alreadyReturned,
      available,
    };
  });
}

export function isValidReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export type ReturnLineSelection = {
  saleItemId: string;
  quantity?: number;
  weight?: string;
};
export type RefundPaymentInput = Pick<SalePayment, "method" | "amount">;
export type ReturnPayloadItem =
  | { sale_item_id: string; quantity: number }
  | { sale_item_id: string; weight: string };

export function hasAnySelection(lines: ReturnLineSelection[]): boolean {
  return lines.some(
    (line) => (line.quantity ?? 0) > 0 || (line.weight !== undefined && isValidWeight(line.weight)),
  );
}

/** Only positive measures go in the request — zero rows are UI state, not intent. */
export function buildReturnPayload(
  reason: string,
  lines: ReturnLineSelection[],
  refundPayments: RefundPaymentInput[],
): {
  reason: string;
  items: ReturnPayloadItem[];
  refund_payments: RefundPaymentInput[];
} {
  const items: ReturnPayloadItem[] = [];
  for (const line of lines) {
    if ((line.quantity ?? 0) > 0) {
      items.push({ sale_item_id: line.saleItemId, quantity: line.quantity! });
    } else if (line.weight !== undefined && isValidWeight(line.weight)) {
      items.push({ sale_item_id: line.saleItemId, weight: line.weight });
    }
  }
  return {
    reason: reason.trim(),
    items,
    refund_payments: refundPayments,
  };
}

/**
 * Value of the merchandise in the current selection — labelled "valor de lo
 * devuelto" in the UI, never "a reintegrar". Sums in integer cents, never
 * floats, same convention as the rest of the money handling.
 */
export function computeSelectionValue(
  lines: ReturnLineSelection[],
  availability: ReturnAvailability[],
): string {
  const byId = new Map(availability.map((item) => [item.saleItemId, item]));
  let cents = 0;
  for (const line of lines) {
    const item = byId.get(line.saleItemId);
    if (!item) continue;
    if ((line.quantity ?? 0) > 0) {
      cents += toCents(item.unitPrice) * line.quantity!;
    } else if (line.weight !== undefined && isValidWeight(line.weight)) {
      cents += toCents(calculateWeightedPrice(line.weight, item.unitPrice));
    }
  }
  return fromCents(cents);
}
