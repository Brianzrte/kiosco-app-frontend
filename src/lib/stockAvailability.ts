/**
 * Only a known numeric quantity at or below zero proves a product cannot be
 * sold. A missing record and every other lookup failure remain unknown.
 */
export type StockAvailability = number | undefined;

export function availabilityFromStockError(status: number): StockAvailability {
  void status;
  return undefined;
}

export function isOutOfStock(
  availability: StockAvailability,
): availability is number {
  return availability !== undefined && availability <= 0;
}
