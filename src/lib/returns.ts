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
import { Return, SaleItem } from "./types";

export type ReturnAvailability = {
  saleItemId: string;
  productId: string;
  productName: string;
  unitPrice: string;
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
      map.set(
        item.sale_item_id,
        (map.get(item.sale_item_id) ?? 0) + item.quantity,
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
    const alreadyReturned = returnedByItem.get(item.id) ?? 0;
    return {
      saleItemId: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: item.unit_price,
      sold: item.quantity,
      alreadyReturned,
      available: Math.max(0, item.quantity - alreadyReturned),
    };
  });
}

export function isValidReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export type ReturnLineSelection = { saleItemId: string; quantity: number };

export function hasAnySelection(lines: ReturnLineSelection[]): boolean {
  return lines.some((line) => line.quantity > 0);
}

/** Only lines with quantity > 0 go in the request — zero-quantity rows are UI state, not intent. */
export function buildReturnPayload(
  reason: string,
  lines: ReturnLineSelection[],
): { reason: string; items: { sale_item_id: string; quantity: number }[] } {
  return {
    reason: reason.trim(),
    items: lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        sale_item_id: line.saleItemId,
        quantity: line.quantity,
      })),
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
    if (line.quantity <= 0) continue;
    const item = byId.get(line.saleItemId);
    if (!item) continue;
    cents += toCents(item.unitPrice) * line.quantity;
  }
  return fromCents(cents);
}
