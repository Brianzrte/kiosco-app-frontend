import { computePageSize } from "./pagination";
import { isValidWeight } from "./weightPricing";
import type { StockMovement } from "./types";

/**
 * Pure helpers for the inventory screen. Kept out of the component so the
 * query-building and low-stock logic can be unit tested without rendering.
 *
 * The low-stock flag is never computed here from `quantity`/`minimum_quantity`
 * — that rule belongs to the backend (`minimum_quantity > 0 AND quantity <
 * minimum_quantity`). This module only builds the query string and reads the
 * backend's own `low_stock_only` filter results.
 */

/** Page size before the viewport has been measured once (first paint). */
export const INVENTORY_DEFAULT_PAGE_SIZE = 15;
// Not 10: on a short viewport, flooring at 10 rows can outgrow the space
// that's actually available and force back the very page scroll this is
// meant to avoid — avoiding the scroll wins over hitting a target count.
export const INVENTORY_MIN_PAGE_SIZE = 5;
export const INVENTORY_MAX_PAGE_SIZE = 15;

/** A non-empty product_id query value is enough; the backend owns UUID validation. */
export function isDeepLinkedProductId(value: string | null): value is string {
  return value !== null && value.trim() !== "";
}

export function computeInventoryPageSize(opts: {
  viewportHeight: number;
  listTop: number;
  rowHeight: number;
  reservedBelow: number;
}): number {
  return computePageSize({
    ...opts,
    min: INVENTORY_MIN_PAGE_SIZE,
    max: INVENTORY_MAX_PAGE_SIZE,
    fallback: INVENTORY_DEFAULT_PAGE_SIZE,
  });
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  SALE: "Venta",
  ADJUSTMENT_IN: "Ajuste (entrada)",
  ADJUSTMENT_OUT: "Ajuste (salida)",
  RETURN: "Devolución",
  SELF_CONSUMPTION: "Autoconsumo",
};

/**
 * `SELF_CONSUMPTION` movements aren't all the same direction: a normal
 * consumption has `quantity_delta < 0` ("Salida"), but voiding one puts the
 * stock back with `quantity_delta > 0` ("Reversión"). The label alone
 * (`MOVEMENT_TYPE_LABELS.SELF_CONSUMPTION` = "Autoconsumo") doesn't carry
 * that distinction, so callers append this qualifier next to it. Returns
 * `null` for every other movement type so callers can skip rendering.
 */
export function getSelfConsumptionQualifier(
  row: Pick<StockMovement, "type" | "quantity_delta">,
): "Salida" | "Reversión" | null {
  if (row.type !== "SELF_CONSUMPTION") return null;
  return row.quantity_delta < 0 ? "Salida" : "Reversión";
}

/**
 * Stock for a weighable product uses the POS weight format. Zero is allowed
 * for initialization and minimums, but not for manual adjustments.
 */
export function isValidStockQuantityKg(
  value: string,
  allowZero: boolean,
): boolean {
  return (
    isValidWeight(value) ||
    (allowZero && ["0", "0.0", "0.00", "0.000"].includes(value))
  );
}

export function formatStockQuantity(
  quantity: number,
  unitType: "unitario" | "pesable",
): string {
  if (unitType === "unitario") return String(quantity);
  if (quantity === 0) return "0,000 kg";
  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 3,
  }).format(quantity)} kg`;
}

export function stockLimitMessageKg(
  productName: string,
  availableKg: string,
): string {
  return `Sólo hay ${availableKg} disponibles de “${productName}”.`;
}

export function buildStockQuery(opts: {
  search: string;
  categoryId: string;
  lowStockOnly: boolean;
  page: number;
  limit: number;
}): string {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  if (opts.categoryId) params.set("category_id", opts.categoryId);
  if (opts.lowStockOnly) params.set("low_stock_only", "true");
  params.set("page", String(opts.page));
  params.set("limit", String(opts.limit));
  return params.toString();
}

export function buildMovementsQuery(opts: {
  productId: string;
  type: string;
  from: string;
  to: string;
  page: number;
  limit?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.productId) params.set("product_id", opts.productId);
  if (opts.type) params.set("type", opts.type);
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  params.set("page", String(opts.page));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  return params.toString();
}

export { computeTotalPages } from "./pagination";

/**
 * Whether a row should render as low stock. `lowStockOnly` means the list is
 * already filtered server-side (every row qualifies); otherwise membership
 * comes from a second, backend-authoritative `low_stock_only=true` query.
 */
export function isRowLow(
  initialized: boolean,
  lowStockOnly: boolean,
  inLowStockSet: boolean,
): boolean {
  if (!initialized) return false;
  return lowStockOnly || inLowStockSet;
}
